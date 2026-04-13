// UserRec lives here so both the slice and Chat components share the same type
export type UserRec = { uid: string; displayName: string; email: string; };

export const chatId = (a: string, b: string) => [a, b].sort().join('__');

export type ChatMessage = {
  fromUid:   string;
  fromEmail: string;
  text:      string;
  timestamp: number; // unix ms
};

export type ChatState = {
  me:            UserRec | null;
  chattingWith:  UserRec | null;
  conversations: Record<string, ChatMessage[]>; // key = partner email
  unread:        Record<string, true>;          // emails with unseen incoming messages
};

type Creator = (...args: any[]) => unknown;
type Reducer  = (s: ChatState, payload: any) => ChatState;

const initialState: ChatState = { me: null, chattingWith: null, conversations: {}, unread: {} };

const creators: Record<string, Creator> = {
  setMe:            (user: UserRec | null)                   => ({ user }),
  chatWith:         (user: UserRec | null)                   => ({ user }),
  setConversation:  (email: string, messages: ChatMessage[]) => ({ email, messages }),
  messageSent:      (email: string, message: ChatMessage)    => ({ email, message }),
  messageReceived:  (email: string, message: ChatMessage)    => ({ email, message }),
};

const appendMessage = (s: ChatState, { email, message }: { email: string; message: ChatMessage }): ChatState => ({
  ...s,
  conversations: {
    ...s.conversations,
    [email]: [...(s.conversations[email] ?? []), message],
  },
});

const reducers: Record<string, Reducer> = {
  setMe: (s, { user }) => ({ ...s, me: user }),

  chatWith: (s, { user }) => {
    const unread = { ...s.unread };
    if (user?.email) delete unread[user.email];
    return { ...s, chattingWith: user, unread };
  },

  setConversation: (s, { email, messages }) => ({
    ...s,
    conversations: { ...s.conversations, [email]: messages },
  }),

  messageSent: appendMessage,

  messageReceived: (s, { email, message }) => {
    const next = appendMessage(s, { email, message });
    if (s.chattingWith?.email === email) return next;
    return { ...next, unread: { ...s.unread, [email]: true } };
  },
};

export const sliceConfig = { name: 'chat', creators, initialState, reducers };
