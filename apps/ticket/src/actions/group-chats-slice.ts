import { ChatMessage } from './chat-slice';

export type GroupChat = {
  id:            string;
  participants:  string[];       // UIDs
  nickname:      string;
  createdBy:     string;
  lastMessageAt: number | null;  // unix ms
  pending:       boolean;        // true = not yet written to Firestore
};

export type GroupChatsState = {
  list:          GroupChat[];
  conversations: Record<string, ChatMessage[]>; // key = group chat id
  unread:        Record<string, true>;
  activeGroupId: string | null;
};

type Creator = (...args: any[]) => unknown;
type Reducer  = (s: GroupChatsState, payload: any) => GroupChatsState;

const initialState: GroupChatsState = {
  list:          [],
  conversations: {},
  unread:        {},
  activeGroupId: null,
};

const creators: Record<string, Creator> = {
  setGroupChats:       (groups: GroupChat[])                          => ({ groups }),
  addGroupChat:        (group: GroupChat)                             => ({ group }),
  setGroupConversation:(id: string, messages: ChatMessage[])          => ({ id, messages }),
  groupMessageSent:    (id: string, message: ChatMessage)             => ({ id, message }),
  groupMessageReceived:(id: string, message: ChatMessage)             => ({ id, message }),
  markGroupRead:       (id: string)                                   => ({ id }),
  setActiveGroup:      (id: string | null)                            => ({ id }),
};

const appendMessage = (
  s: GroupChatsState,
  { id, message }: { id: string; message: ChatMessage },
): GroupChatsState => ({
  ...s,
  conversations: {
    ...s.conversations,
    [id]: [...(s.conversations[id] ?? []), message],
  },
});

const reducers: Record<string, Reducer> = {
  setGroupChats: (s, { groups }) => ({
    ...s,
    // Preserve pending chats that Firestore doesn't know about yet
    list: [
      ...s.list.filter(g => g.pending),
      ...groups,
    ],
  }),

  addGroupChat: (s, { group }) => ({
    ...s,
    list: [...s.list, group],
  }),

  setGroupConversation: (s, { id, messages }) => ({
    ...s,
    conversations: { ...s.conversations, [id]: messages },
  }),

  groupMessageSent: (s, { id, message }) => {
    // Once a message is sent the group is no longer pending
    const list = s.list.map(g => g.id === id ? { ...g, pending: false, lastMessageAt: message.timestamp } : g);
    return { ...appendMessage(s, { id, message }), list };
  },

  groupMessageReceived: (s, { id, message }) => {
    const list = s.list.map(g => g.id === id ? { ...g, lastMessageAt: message.timestamp } : g);
    const next = { ...appendMessage(s, { id, message }), list };
    return { ...next, unread: { ...next.unread, [id]: true } };
  },

  markGroupRead: (s, { id }) => {
    const unread = { ...s.unread };
    delete unread[id];
    return { ...s, unread };
  },

  setActiveGroup: (s, { id }) => ({ ...s, activeGroupId: id }),
};

export const sliceConfig = { name: 'groupChats', creators, initialState, reducers };
