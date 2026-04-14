/**
 * Derives a Firestore-safe key from the current app's origin.
 * Used to namespace all Firestore paths so multiple apps on different
 * origins can share one Firebase project without data collision.
 *
 * Examples:
 *   localhost:5173  →  "localhost_5173"
 *   localhost:5174  →  "localhost_5174"
 *   app.example.com →  "app.example.com"
 */
export const appKey = (): string => {
  const { hostname, port } = window.location;
  return port ? `${hostname}_${port}` : hostname;
};
