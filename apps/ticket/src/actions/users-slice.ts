export type UserProfile = {
  uid:         string;
  email:       string;
  displayName: string;
  photoURL:    string | null;
  lastSeen:    number | null; // unix ms — converted from Firestore Timestamp at the boundary
  isOnline:    boolean;
};

export type UsersState = {
  list:              UserProfile[];
  inactivityTimeout: number; // ms — user is considered idle once lastSeen is older than this
};

type Creator = (...args: any[]) => unknown;
type Reducer  = (s: UsersState, payload: any) => UsersState;

export const INACTIVITY_TIMEOUT_MS = 0.5 * 60 * 1000; // 5 minutes — never modified at runtime

const initialState: UsersState = {
  list: [],
  inactivityTimeout: INACTIVITY_TIMEOUT_MS,
};

const creators: Record<string, Creator> = {
  setUsers: (users: UserProfile[]) => ({ users }),
};

const reducers: Record<string, Reducer> = {
  setUsers: (s, { users }) => ({ ...s, list: users }),
};

export const sliceConfig = { name: 'users', creators, initialState, reducers };
