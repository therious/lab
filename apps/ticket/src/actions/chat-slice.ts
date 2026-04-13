// UserRec lives here so both the slice and Chat components share the same type
export type UserRec = { uid: string; displayName: string; email: string; };

export type ChatMessage = {
  fromUid:   string;
  fromEmail: string;
  text:      string;
  timestamp: number; // unix ms
};

export type ChatState = {
  me:            UserRec | null;                // the logged-in user
  chattingWith:  UserRec | null;               // currently selected conversation partner
  conversations: Record<string, ChatMessage[]>; // key = partner's email address
};

type Creator = (...args: any[]) => unknown;
type Reducer  = (s: ChatState, payload: any) => ChatState;

const initialState: ChatState = { me: null, chattingWith: null, conversations: {} };

const creators: Record<string, Creator> = {
  setMe:           (user: UserRec | null)                     => ({ user }),
  chatWith:        (user: UserRec | null)                     => ({ user }),
  setConversation: (email: string, messages: ChatMessage[])   => ({ email, messages }),
  addMessage:      (email: string, message: ChatMessage)      => ({ email, message }),
};

const reducers: Record<string, Reducer> = {
  setMe:    (s, { user }) => ({ ...s, me: user }),
  chatWith: (s, { user }) => ({ ...s, chattingWith: user }),

  setConversation: (s, { email, messages }) => ({
    ...s,
    conversations: { ...s.conversations, [email]: messages },
  }),

  addMessage: (s, { email, message }) => ({
    ...s,
    conversations: {
      ...s.conversations,
      [email]: [...(s.conversations[email] ?? []), message],
    },
  }),
};

export const sliceConfig = { name: 'chat', creators, initialState, reducers };
