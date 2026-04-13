export type UserProfile = {
  uid:         string;
  email:       string;
  displayName: string;
  photoURL:    string | null;
  lastSeen:    number | null; // unix ms — converted from Firestore Timestamp at the boundary
  isOnline:    boolean;
};

export type UsersState = {
  list: UserProfile[];
};

type Creator = (...args: any[]) => unknown;
type Reducer  = (s: UsersState, payload: any) => UsersState;

const initialState: UsersState = { list: [] };

const creators: Record<string, Creator> = {
  setUsers: (users: UserProfile[]) => ({ users }),
};

const reducers: Record<string, Reducer> = {
  setUsers: (s, { users }) => ({ ...s, list: users }),
};

export const sliceConfig = { name: 'users', creators, initialState, reducers };
