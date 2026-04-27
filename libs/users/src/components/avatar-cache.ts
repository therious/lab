// Shared avatar blob-URL cache — usable by any component in the users lib.
// Fetches the remote photo URL once per uid, stores as a blob: URL so
// subsequent renders are instant and CORS/referrer issues only happen once.

export const avatarBlobCache  = new Map<string, string>();   // uid → blob URL
const avatarFetchInFlight = new Set<string>();                // uids being fetched

export async function fetchAvatarBlob(uid: string, photoURL: string): Promise<string | null> {
  if (avatarFetchInFlight.has(uid)) return avatarBlobCache.get(uid) ?? null;
  avatarFetchInFlight.add(uid);
  try {
    const res = await fetch(photoURL, { referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`${res.status}`);
    const blob    = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const prev    = avatarBlobCache.get(uid);
    if (prev) URL.revokeObjectURL(prev);
    avatarBlobCache.set(uid, blobUrl);
    return blobUrl;
  } catch {
    return avatarBlobCache.get(uid) ?? null;  // stale cache is better than nothing
  } finally {
    avatarFetchInFlight.delete(uid);
  }
}
