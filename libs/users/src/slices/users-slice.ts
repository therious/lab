export type UserProfile = {
  uid:         string;
  email:       string;
  displayName: string;
  photoURL:    string | null;
  lastSeen:    number | null; // unix ms — converted from Firestore Timestamp at the boundary
  isOnline:    boolean;
};

export type UsersState = {
  list:                  UserProfile[];
  inactivityTimeout:     number; // ms — user is considered idle once lastSeen is older than this
  statusRefreshInterval: number; // ms — how often the grid re-evaluates the online dot colour
};

type Creator = (...args: any[]) => unknown;
type Reducer  = (s: UsersState, payload: any) => UsersState;

export const INACTIVITY_TIMEOUT_MS = 0.5 * 60 * 1000; // 30 seconds (set to 5*60*1000 for prod) — never modified at runtime

export const STATUS_REFRESH_INTERVAL_MS = 15_000; // 15 s — how often the online dot re-evaluates

const initialState: UsersState = {
  list:                  [],
  inactivityTimeout:     INACTIVITY_TIMEOUT_MS,
  statusRefreshInterval: STATUS_REFRESH_INTERVAL_MS,
};

const creators: Record<string, Creator> = {
  setUsers: (users: UserProfile[]) => ({ users }),
};

const reducers: Record<string, Reducer> = {
  setUsers: (s, { users }) => ({ ...s, list: users }),
};

export const sliceConfig = { name: 'users', creators, initialState, reducers };
