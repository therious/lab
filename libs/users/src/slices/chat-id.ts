import { snowflakeId, isSnowflakeId, reqIdDescribeN, reservePrefix } from '@therious/utils';

// Reserve '§' (Section) prefix for chat messages.
// reservePrefix throws if already reserved — guard for HMR / test re-imports.
try { reservePrefix('§', 'chat message'); } catch (_) { /* already reserved */ }

/** Generate a new chat message ID. */
export const chatMsgId = (): string => snowflakeId('§');

/**
 * Extract wall-clock milliseconds from a chat snowflake ID.
 * Falls back to Date.now() for legacy Firestore auto-IDs.
 */
export const tsFromMsgId = (id: string): number =>
  isSnowflakeId(id) ? reqIdDescribeN(id).request : Date.now();

/**
 * Derive the display timestamp from a Firestore message document.
 * New messages: no timestamp field — derive from snowflake doc ID.
 * Old messages: Firestore Timestamp object or plain Number.
 */
export const msgTimestamp = (data: any, docId: string): number => {
  if (data.timestamp == null)        return tsFromMsgId(docId);
  if (typeof data.timestamp === 'number') return data.timestamp;
  return data.timestamp?.toMillis?.() ?? tsFromMsgId(docId);
};

// ── Causal heads tracking ─────────────────────────────────────────────────────
// Each conversation maintains a set of "head" message IDs — messages not yet
// referenced as parents by any subsequent message. Analogous to git HEAD set.
//
// Update rule on each incoming message M with parents P:
//   1. Remove every id in P from heads (they are now reachable through M)
//   2. Add M's own id to heads

export type Heads = Set<string>;

export const makeHeads = (): Heads => new Set();

export const updateHeads = (heads: Heads, msgId: string, parents: string[]): void => {
  for (const p of parents) heads.delete(p);
  heads.add(msgId);
};

/** Snapshot the current heads as a sorted array for storage in a message. */
export const snapshotHeads = (heads: Heads): string[] => [...heads].sort();
