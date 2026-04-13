export const HISTORY_LIMIT = 100;

export const chatId = (a: string, b: string) => [a, b].sort().join('__');

export type UserRec = { uid: string; displayName: string; email: string; };

export type ChatMessage = {
  fromUid:   string;
  fromEmail: string;
  text:      string;
  timestamp: number; // unix ms
};

export type GroupChat = {
  id:            string;
  participants:  string[];       // UIDs
  nickname:      string;
  createdBy:     string;
  lastMessageAt: number | null;  // unix ms
  pending:       boolean;        // true = Firestore doc not yet written
};

// Discriminated union — one active conversation at a time
export type ChatTarget =
  | { kind: '1-1';   user:  UserRec }
  | { kind: 'group'; id:    string  };

// Conversation store key: partner email for 1-1, group id for groups
export const targetKey = (t: ChatTarget): string =>
  t.kind === '1-1' ? t.user.email : t.id;

export type ChatState = {
  me:            UserRec | null;
  active:        ChatTarget | null;
  conversations: Record<string, ChatMessage[]>;
  unread:        Record<string, true>;
  groups:        GroupChat[];
};

type Creator = (...args: any[]) => unknown;
type Reducer  = (s: ChatState, payload: any) => ChatState;

const initialState: ChatState = {
  me:            null,
  active:        null,
  conversations: {},
  unread:        {},
  groups:        [],
};

const creators: Record<string, Creator> = {
  setMe:               (user: UserRec | null)                => ({ user }),
  setActive:           (target: ChatTarget | null)           => ({ target }),
  setConversation:     (id: string, msgs: ChatMessage[])     => ({ id, msgs }),
  messageSent:         (id: string, message: ChatMessage)    => ({ id, message }),
  messageReceived:     (id: string, message: ChatMessage)    => ({ id, message }),
  groupMessageSent:    (id: string, message: ChatMessage)    => ({ id, message }),
  groupMessageReceived:(id: string, message: ChatMessage)    => ({ id, message }),
  setGroups:           (groups: GroupChat[])                 => ({ groups }),
  addGroup:            (group: GroupChat)                    => ({ group }),
};

const appendMessage = (
  s: ChatState,
  { id, message }: { id: string; message: ChatMessage },
): ChatState => ({
  ...s,
  conversations: {
    ...s.conversations,
    [id]: [...(s.conversations[id] ?? []), message],
  },
});

const reducers: Record<string, Reducer> = {
  setMe: (s, { user }) => ({ ...s, me: user }),

  setActive: (s, { target }) => {
    const id     = target ? targetKey(target) : null;
    const unread = id ? (({ [id]: _, ...rest }) => rest)(s.unread) : s.unread;
    return { ...s, active: target, unread };
  },

  setConversation: (s, { id, msgs }) => ({
    ...s,
    conversations: { ...s.conversations, [id]: msgs },
  }),

  messageSent: appendMessage,

  messageReceived: (s, { id, message }) => {
    const next     = appendMessage(s, { id, message });
    const isActive = s.active?.kind === '1-1' && s.active.user.email === id;
    return isActive ? next : { ...next, unread: { ...next.unread, [id]: true } };
  },

  groupMessageSent: (s, { id, message }) => {
    const groups = s.groups.map(g =>
      g.id === id ? { ...g, pending: false, lastMessageAt: message.timestamp } : g
    );
    return { ...appendMessage(s, { id, message }), groups };
  },

  groupMessageReceived: (s, { id, message }) => {
    const groups   = s.groups.map(g =>
      g.id === id ? { ...g, lastMessageAt: message.timestamp } : g
    );
    const next     = { ...appendMessage(s, { id, message }), groups };
    const isActive = s.active?.kind === 'group' && s.active.id === id;
    return isActive ? next : { ...next, unread: { ...next.unread, [id]: true } };
  },

  setGroups: (s, { groups }) => ({
    ...s,
    groups: [
      ...s.groups.filter(g => g.pending), // preserve unsent local groups
      ...groups,
    ],
  }),

  addGroup: (s, { group }) => ({ ...s, groups: [...s.groups, group] }),
};

export const sliceConfig = { name: 'chat', creators, initialState, reducers };
