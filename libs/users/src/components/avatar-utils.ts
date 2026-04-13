export const AVATAR_COLORS = [
  '#e53935', '#d81b60', '#8e24aa', '#5e35b1',
  '#1e88e5', '#00897b', '#43a047', '#f4511e',
  '#fb8c00', '#6d4c41', '#546e7a', '#00acc1',
];

export const hashColor = (email: string): string => {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

// Returns the status dot fill colour given presence data.
// grey = never seen / offline, amber = idle, green = active
export const statusDotColor = (
  isOnline: boolean,
  lastSeen: number | null,
  inactivityMs: number,
): string => {
  if (!isOnline) return '#dadce0';
  if (lastSeen && Date.now() - lastSeen > inactivityMs) return '#f9a825';
  return '#34a853';
};
