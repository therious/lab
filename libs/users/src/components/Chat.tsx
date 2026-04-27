import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { collection, doc, setDoc, writeBatch,
         query, orderBy, limitToLast, onSnapshot } from 'firebase/firestore';
import { appKey } from '../app-key';
import { User } from 'firebase/auth';
import styled from 'styled-components';
import { useUsersCtx } from '../context';
import { ChatMessage, UserRec, GroupChat, chatId, HISTORY_LIMIT } from '../slices/chat-slice';
import { chatMsgId, msgTimestamp, makeHeads, updateHeads, snapshotHeads, miniSessionOf, Heads } from '../slices/chat-id';
import { isSnowflakeId } from '@therious/utils';
import { UserProfile, INACTIVITY_TIMEOUT_MS } from '../slices/users-slice';
import { hashColor, statusDotColor } from './avatar-utils';

// ── Styles ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border: 1px solid #dadce0;
  border-radius: 4px;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 10px 14px;
  background: #1a73e8;
  color: white;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const HeaderLabel = styled.span`
  font-weight: normal;
  opacity: 0.85;
  margin-right: 2px;
`;

const Placeholder = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #aaa;
  font-size: 14px;
  font-style: italic;
`;

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
`;

// $alignRight overrides which edge BubbleWrap docks to (used in graph mode where
// the conventional left/right is reversed relative to the column it lives in).
const BubbleWrap = styled.div<{ $mine: boolean; $alignRight?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${p => p.$mine ? 'flex-end' : 'flex-start'};
  align-self:  ${p => (p.$alignRight !== undefined ? p.$alignRight : p.$mine) ? 'flex-end' : 'flex-start'};
`;

// $tailRight overrides which side the tail appears on (defaults to $mine).
// In graph mode the SVG is centred, so both sides want a tail pointing inward.
// Sizes both the bubble and the time/name row together:
// min-width = natural width of the nowrap time row; max-width = 300px (or available space).
const BubbleBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  max-width: min(300px, 100%);
`;

const Bubble = styled.div<{ $mine: boolean; $tailRight?: boolean }>`
  position: relative;
  padding: 7px 11px;
  border-radius: 14px;
  font-size: 13px;
  background: ${p => p.$mine ? '#3c4043' : '#f1f3f4'};
  color: ${p => p.$mine ? 'white' : '#202124'};
  word-break: break-word;

  &::after {
    content: '';
    position: absolute;
    bottom: 8px;
    border-style: solid;
    right: ${p => (p.$tailRight ?? p.$mine) ? '-6px' : 'auto'};
    left:  ${p => (p.$tailRight ?? p.$mine) ? 'auto'  : '-6px'};
    border-width: ${p => (p.$tailRight ?? p.$mine) ? '6px 0 6px 8px' : '6px 8px 6px 0'};
    border-color: ${p => (p.$tailRight ?? p.$mine)
      ? `transparent transparent transparent ${p.$mine ? '#3c4043' : '#f1f3f4'}`
      : `transparent ${p.$mine ? '#3c4043' : '#f1f3f4'} transparent transparent`};
  }
`;

const BubbleTime = styled.div<{ $mine: boolean }>`
  font-size: 10px;
  color: #aaa;
  margin: 1px 4px 0;
  white-space: nowrap;
`;

const SenderLabel = styled.div`
  font-size: 10px;
  color: #888;
  margin: 0 4px 2px;
`;

// Row wrapper used for others' group messages: [avatar] [bubble column]
const MsgRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 6px;
  align-self: flex-start;
`;

const DateSep = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #aaa;
  margin: 4px 0;
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #eee;
  }
`;

const toDateKey = (ts: number) => new Date(ts).toDateString();

const InputRow = styled.div`
  display: flex;
  padding: 8px;
  gap: 6px;
  border-top: 1px solid #eee;
  flex-shrink: 0;
`;

const TextInput = styled.input`
  flex: 1;
  padding: 7px 12px;
  border: 1px solid #dadce0;
  border-radius: 20px;
  font-size: 13px;
  outline: none;
  font-family: inherit;
  &:focus { border-color: #1a73e8; }
`;

const SendBtn = styled.button`
  padding: 7px 14px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  &:disabled { opacity: 0.45; cursor: default; }
  &:not(:disabled):hover { background: #1558b0; }
`;

const ErrorBar = styled.div`
  padding: 6px 12px;
  background: #fce8e6;
  color: #c5221f;
  font-size: 12px;
  border-top: 1px solid #f5c6c4;
  flex-shrink: 0;
`;

// ── Avatar blob cache (page-lifetime) ────────────────────────────────────────
// Fetch each avatar URL once per page load and store it as a blob URL so it
// survives token expiry and transient network blips.  On failure, the last
// successfully fetched blob URL is used as a fallback.

const _avatarBlobCache  = new Map<string, string>();   // uid → blob URL
const _avatarFetchInFlight = new Set<string>();         // uids currently being fetched

async function _fetchAvatarBlob(uid: string, photoURL: string): Promise<string | null> {
  if (_avatarFetchInFlight.has(uid)) return _avatarBlobCache.get(uid) ?? null;
  _avatarFetchInFlight.add(uid);
  try {
    const res = await fetch(photoURL, { referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`${res.status}`);
    const blob    = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const prev    = _avatarBlobCache.get(uid);
    if (prev) URL.revokeObjectURL(prev);
    _avatarBlobCache.set(uid, blobUrl);
    return blobUrl;
  } catch {
    return _avatarBlobCache.get(uid) ?? null;  // stale cache is better than nothing
  } finally {
    _avatarFetchInFlight.delete(uid);
  }
}

// ── Shared avatar with status dot ────────────────────────────────────────────

type AvatarProps = {
  profile:  UserProfile | null;
  fallback: { email: string; displayName?: string };
  size?:    number;
};

const Avatar = ({ profile, fallback, size = 24 }: AvatarProps) => {
  const uid       = profile?.uid ?? null;
  const photoURL  = profile?.photoURL ?? null;

  // Resolved img src: starts as whatever we have (blob cache or raw URL), updates
  // after a fresh fetch completes.
  const [imgSrc, setImgSrc] = useState<string | null>(() => {
    if (!uid || !photoURL) return null;
    return _avatarBlobCache.get(uid) ?? photoURL;
  });

  useEffect(() => {
    if (!uid || !photoURL) { setImgSrc(null); return; }
    // If already cached, use it immediately and skip re-fetch.
    if (_avatarBlobCache.has(uid)) { setImgSrc(_avatarBlobCache.get(uid)!); return; }
    _fetchAvatarBlob(uid, photoURL).then(url => { if (url) setImgSrc(url); });
  }, [uid, photoURL]);

  const dotSize = Math.round(size * 0.34);
  const dot = profile ? (
    <div style={{
      position: 'absolute', bottom: 0, right: 0,
      width: dotSize, height: dotSize, borderRadius: '50%',
      background: statusDotColor(profile.isOnline, profile.lastSeen, INACTIVITY_TIMEOUT_MS),
      border: `${Math.max(1, Math.round(dotSize * 0.22))}px solid #000`,
    }} />
  ) : null;

  const wrap: React.CSSProperties = {
    position: 'relative', display: 'inline-block', flexShrink: 0,
    width: size, height: size,
  };

  if (imgSrc) {
    return (
      <div style={wrap}>
        <img src={imgSrc}
          alt=""
          style={{ width: size, height: size, borderRadius: '50%', display: 'block' }}
          onError={() => {
            // Fetch failed or blob URL expired — re-fetch and fall back to cache.
            if (uid && photoURL) {
              _fetchAvatarBlob(uid, photoURL).then(url => { if (url) setImgSrc(url); });
            }
            setImgSrc(_avatarBlobCache.get(uid ?? '') ?? null);
          }}
        />
        {dot}
      </div>
    );
  }

  const src   = profile ?? fallback;
  const label = (('displayName' in src ? src.displayName : undefined) || src.email || '?')[0].toUpperCase();
  const bg    = hashColor(src.email);
  return (
    <div style={wrap}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: bg,
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.46) }}>
        {label}
      </div>
      {dot}
    </div>
  );
};

// ── Shared message list renderer ──────────────────────────────────────────────

const MessageList = ({ messages, myUid, showAvatars = false }:
    { messages: ChatMessage[]; myUid: string; showAvatars?: boolean }) => {
  const { useSelector } = useUsersCtx();
  const bottomRef  = useRef<HTMLDivElement>(null);
  const allUsers   = useSelector((s: any) => s.users.list);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <Messages>
      {messages.map((m, i) => {
        const mine      = m.fromUid === myUid;
        const time      = new Date(m.timestamp).toLocaleTimeString(undefined,
          { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const showSep   = i === 0 || toDateKey(messages[i - 1].timestamp) !== toDateKey(m.timestamp);
        const dateLabel = new Date(m.timestamp).toLocaleDateString(undefined,
          { weekday: 'long', month: 'long', day: 'numeric' });
        const profile   = allUsers.find((u: UserProfile) => u.uid === m.fromUid) ?? null;

        const bubble = (
          <BubbleWrap $mine={mine}>
            <BubbleBody>
              <Bubble $mine={mine}>{m.text}</Bubble>
              <BubbleTime $mine={mine}>
                {time}
                {showAvatars && !mine && (
                  <span style={{ color: '#888', marginLeft: 6 }}>
                    {profile?.displayName ?? m.fromEmail}
                  </span>
                )}
              </BubbleTime>
            </BubbleBody>
          </BubbleWrap>
        );

        return (
          <React.Fragment key={i}>
            {showSep && <DateSep>{dateLabel}</DateSep>}
            {showAvatars && !mine ? (
              <MsgRow>
                <Avatar profile={profile} fallback={{ email: m.fromEmail }} size={28} />
                {bubble}
              </MsgRow>
            ) : bubble}
          </React.Fragment>
        );
      })}
      <div ref={bottomRef} />
    </Messages>
  );
};

// ── Graph view ───────────────────────────────────────────────────────────────

const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 3px 8px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  background: #fafafa;
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  font-size: 11px;
  padding: 2px 8px;
  border: 1px solid ${p => p.$active ? '#1a73e8' : '#dadce0'};
  border-radius: 12px;
  background: ${p => p.$active ? '#e8f0fe' : 'white'};
  color: ${p => p.$active ? '#1a73e8' : '#5f6368'};
  cursor: pointer;
  &:hover { border-color: #1a73e8; }
`;

const LANE_W     = 32;   // px per lane — must be >= AVATAR_R*2 so circles don't overlap
const AVATAR_R   = 13;   // SVG avatar radius (diameter 26)
const ROW_H      = 64;   // fixed height per message row
const DATE_SEP_H = 30;   // height of a date separator row

// Assign each message a horizontal lane. Legacy auto-ID messages (no parents,
// no snowflake ID) share lane 0 in sequence. Snowflake messages form the real DAG.
//
// A slot is only inheritable if the parent STILL occupies it — i.e. no other
// child has already claimed it.  Without this check, sibling messages (two
// children of the same parent sent concurrently) both land in the parent's slot
// and appear as a straight line instead of a branch.
function computeLanes(messages: ChatMessage[]): Map<string, number> {
  const slots: (string | null)[] = [];   // slot index → current thread owner id
  const result = new Map<string, number>();

  for (const msg of messages) {
    if (!msg.id) continue;
    const legacy  = !isSnowflakeId(msg.id);
    const parents = legacy ? [] : (msg.parents ?? []);

    // Only parents that still own their original slot can be inherited
    const inheritableSlots: number[] = parents
      .map(p => ({ pid: p, s: result.get(p) }))
      .filter((x): x is { pid: string; s: number } =>
        x.s !== undefined && slots[x.s] === x.pid,
      )
      .map(x => x.s);

    let slot: number;
    if (legacy) {
      // Legacy messages form a sequential chain in lane 0
      slot = 0;
      slots[0] = msg.id;
    } else if (inheritableSlots.length > 0) {
      // Continue the earliest inheritable parent thread; merge any others
      slot = Math.min(...inheritableSlots);
      for (const ps of inheritableSlots) if (ps !== slot) slots[ps] = null;
      slots[slot] = msg.id;
    } else {
      // All parent slots were already claimed by siblings — open a new lane
      slot = slots.indexOf(null);
      if (slot < 0) { slot = slots.length; slots.push(null); }
      slots[slot] = msg.id;
    }
    result.set(msg.id, slot);
  }
  return result;
}

type MsgLayout = {
  msg:         ChatMessage;
  lane:        number;
  cy:          number;   // dot center Y in SVG coordinates
  rowTopY:     number;   // top of the message row
  showSep:     boolean;
  dateLabel:   string;
  dateSepTopY: number;   // top of date separator (only when showSep)
};

function computeLayout(
  messages: ChatMessage[],
  msgToLane: Map<string, number>,
): { items: MsgLayout[]; totalH: number } {
  let y = 0;
  const items: MsgLayout[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg      = messages[i];
    const showSep  = i === 0 || toDateKey(messages[i - 1].timestamp) !== toDateKey(msg.timestamp);
    const dateSepTopY = y;
    if (showSep) y += DATE_SEP_H;
    items.push({
      msg,
      lane:        msg.id ? (msgToLane.get(msg.id) ?? 0) : 0,
      cy:          y + ROW_H / 2,
      rowTopY:     y,
      showSep,
      dateLabel:   new Date(msg.timestamp).toLocaleDateString(undefined,
                     { weekday: 'long', month: 'long', day: 'numeric' }),
      dateSepTopY,
    });
    y += ROW_H;
  }
  return { items, totalH: y };
}

// ── SVG avatar node (renders inside <svg>) ───────────────────────────────────

type SvgAvatarNodeProps = {
  cx: number; cy: number; r: number;
  uid: string; profile: UserProfile | null; fallback: { email: string };
  nodeId: string;
};

const SvgAvatarNode = ({ cx, cy, r, uid, profile, fallback, nodeId }: SvgAvatarNodeProps) => {
  const photoURL = profile?.photoURL ?? null;

  const [imgSrc, setImgSrc] = useState<string | null>(() => {
    if (!uid || !photoURL) return null;
    return _avatarBlobCache.get(uid) ?? photoURL;
  });

  useEffect(() => {
    if (!uid || !photoURL) { setImgSrc(null); return; }
    if (_avatarBlobCache.has(uid)) { setImgSrc(_avatarBlobCache.get(uid)!); return; }
    _fetchAvatarBlob(uid, photoURL).then(url => { if (url) setImgSrc(url); });
  }, [uid, photoURL]);

  const clipId  = `svgav-${nodeId}`;
  const dotR    = Math.round(r * 0.33);
  const dotCx   = Math.round(cx + r * 0.65);
  const dotCy   = Math.round(cy + r * 0.65);
  const dotFill = profile
    ? statusDotColor(profile.isOnline, profile.lastSeen, INACTIVITY_TIMEOUT_MS)
    : '#dadce0';

  const statusDot = (
    <circle cx={dotCx} cy={dotCy} r={dotR} fill={dotFill} stroke="white" strokeWidth={1.5} />
  );

  if (imgSrc) {
    return (
      <g>
        <defs>
          <clipPath id={clipId}><circle cx={cx} cy={cy} r={r} /></clipPath>
        </defs>
        <image href={imgSrc}
               x={cx - r} y={cy - r} width={r * 2} height={r * 2}
               clipPath={`url(#${clipId})`}
               onError={(() => {
                 setImgSrc(null);
                 if (photoURL) _fetchAvatarBlob(uid, photoURL).then(u => { if (u) setImgSrc(u); });
               }) as unknown as React.ReactEventHandler<SVGImageElement>} />
        {statusDot}
      </g>
    );
  }

  const label = (profile?.displayName ?? profile?.email ?? fallback.email ?? '?')[0].toUpperCase();
  const bg    = hashColor(profile?.email ?? fallback.email);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={bg} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
            fill="white" fontSize={Math.round(r * 0.88)}
            style={{ userSelect: 'none', pointerEvents: 'none' }}>
        {label}
      </text>
      {statusDot}
    </g>
  );
};

const GraphView = ({ messages, myUid, showAvatars = false }:
    { messages: ChatMessage[]; myUid: string; showAvatars?: boolean }) => {
  const { useSelector } = useUsersCtx();
  const bottomRef = useRef<HTMLDivElement>(null);
  const allUsers  = useSelector((s: any) => s.users.list);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const msgToLane = useMemo(() => computeLanes(messages), [messages]);
  const maxLane   = useMemo(
    () => msgToLane.size === 0 ? 0 : Math.max(0, ...msgToLane.values()),
    [msgToLane],
  );
  const { items, totalH } = useMemo(
    () => computeLayout(messages, msgToLane),
    [messages, msgToLane],
  );
  const msgToCY = useMemo(() => {
    const m = new Map<string, { cx: number; cy: number }>();
    for (const item of items)
      if (item.msg.id) m.set(item.msg.id, { cx: item.lane * LANE_W + LANE_W / 2, cy: item.cy });
    return m;
  }, [items]);

  const svgW = (maxLane + 1) * LANE_W;

  // Lines drawn first so avatar circles render on top.
  // Same-minisession connections (same browser tab) are drawn dotted to
  // de-emphasise the obvious "I typed these in sequence" causality.
  const lines = useMemo(() => items.flatMap(({ msg, lane, cy }) => {
    const cx           = lane * LANE_W + LANE_W / 2;
    const childSession = miniSessionOf(msg.id ?? '');

    return (msg.parents ?? []).flatMap(pid => {
      const p = msgToCY.get(pid);
      if (!p) return [];

      const sameSession     = childSession !== null && miniSessionOf(pid) === childSession;
      const stroke          = '#c8d3e8';
      const strokeWidth     = 1.5;
      const strokeDasharray = sameSession ? '4 4' : undefined;
      const opacity         = sameSession ? 0.5 : 1;

      if (p.cx === cx) {
        return [<line key={`${msg.id}-${pid}`}
          x1={cx} y1={cy} x2={p.cx} y2={p.cy}
          stroke={stroke} strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray} opacity={opacity} />];
      }
      const midY = (cy + p.cy) / 2;
      return [<path key={`${msg.id}-${pid}`}
        d={`M${cx},${cy} C${cx},${midY} ${p.cx},${midY} ${p.cx},${p.cy}`}
        fill="none" stroke={stroke} strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray} opacity={opacity} />];
    });
  }), [items, msgToCY]);

  // Layout: [others bubble (flex1)] [left avatar (AVATAR_COL)] [SVG (svgW, absolute)]
  //          [right avatar (AVATAR_COL)] [mine bubble (flex1)]
  // The SVG is absolutely centred over the whole container.  Because both sides
  // are symmetric (flex:1 + AVATAR_COL), the SVG spacer lands exactly at 50%.
  return (
    <Messages>
      <div style={{ position: 'relative', minHeight: totalH }}>

        {/* SVG overlay — centred absolutely; lines behind avatars */}
        <svg style={{
          position: 'absolute',
          left: `calc(50% - ${svgW / 2}px)`,
          top: 0,
          overflow: 'visible',
          zIndex: 0,
        }} width={svgW} height={totalH}>
          {lines}
          {items.map(({ msg, lane, cy }) => {
            const cx      = lane * LANE_W + LANE_W / 2;
            const profile = allUsers.find((u: UserProfile) => u.uid === msg.fromUid) ?? null;
            return (
              <SvgAvatarNode key={`av-${msg.id ?? cy}`}
                cx={cx} cy={cy} r={AVATAR_R}
                uid={msg.fromUid}
                nodeId={msg.id ?? `${lane}-${Math.round(cy)}`}
                profile={profile}
                fallback={{ email: msg.fromEmail }} />
            );
          })}
        </svg>

        {/* Rows — stacked, each has the same 5-cell flex layout */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {items.map((layout, i) => {
            const { msg, showSep, dateLabel } = layout;
            const mine    = msg.fromUid === myUid;
            const time    = new Date(msg.timestamp).toLocaleTimeString(undefined,
              { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const profile = allUsers.find((u: UserProfile) => u.uid === msg.fromUid) ?? null;

            return (
              <React.Fragment key={i}>
                {showSep && (
                  <div style={{ height: DATE_SEP_H }}>
                    <DateSep style={{ height: '100%', margin: 0 }}>{dateLabel}</DateSep>
                  </div>
                )}
                <div style={{ height: ROW_H, display: 'flex', alignItems: 'center' }}>

                  {/* Left: others' bubble — right-aligned toward centre */}
                  {/* overflow:visible so the ::after tail pseudo-element is not clipped */}
                  <div style={{ flex: 1, minWidth: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    {!mine && (
                      // paddingTop offsets BubbleTime height so the Bubble itself centres on avatar cy
                      <BubbleWrap $mine={false} $alignRight={true} style={{ paddingTop: 14 }}>
                        <BubbleBody>
                          <Bubble $mine={false} $tailRight={true}>{msg.text}</Bubble>
                          <BubbleTime $mine={false}>
                            {time}
                            {showAvatars && (
                              <span style={{ color: '#888', marginLeft: 6 }}>
                                {profile?.displayName ?? msg.fromEmail}
                              </span>
                            )}
                          </BubbleTime>
                        </BubbleBody>
                      </BubbleWrap>
                    )}
                  </div>

                  {/* Centre spacer — SVG avatars live here */}
                  <div style={{ width: svgW, flexShrink: 0 }} />

                  {/* Right: my bubble — left-aligned toward centre */}
                  <div style={{ flex: 1, minWidth: 0,
                                display: 'flex', alignItems: 'center' }}>
                    {mine && (
                      <BubbleWrap $mine={true} $alignRight={false} style={{ paddingTop: 14 }}>
                        <BubbleBody>
                          <Bubble $mine={true} $tailRight={false}>{msg.text}</Bubble>
                          <BubbleTime $mine={true}>{time}</BubbleTime>
                        </BubbleBody>
                      </BubbleWrap>
                    )}
                  </div>

                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      <div ref={bottomRef} />
    </Messages>
  );
};

// ── Header avatars ────────────────────────────────────────────────────────────

const HeaderAvatar = ({ them }: { them: UserRec }) => {
  const { useSelector } = useUsersCtx();
  const profile = useSelector((s: any) => s.users.list.find((u: UserProfile) => u.uid === them.uid) ?? null);
  return <Avatar profile={profile} fallback={them} size={24} />;
};

const GroupHeaderAvatars = ({ group }: { group: GroupChat }) => {
  const { useSelector } = useUsersCtx();
  const myUid    = useSelector((s: any) => s.chat.me?.uid);
  const allUsers = useSelector((s: any) => s.users.list);
  const profiles = group.participants
    .filter((uid: string) => uid !== myUid)
    .map((uid: string) => allUsers.find((u: UserProfile) => u.uid === uid) ?? null)
    .filter((p: UserProfile | null): p is UserProfile => p !== null)
    .slice(0, 3);

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {profiles.map((p: UserProfile) => <Avatar key={p.uid} profile={p} fallback={p} size={24} />)}
    </div>
  );
};

// ── 1-1 chat ─────────────────────────────────────────────────────────────────

const ActiveChat = ({ me, them }: { me: User; them: UserRec }) => {
  const { db, actions, useSelector } = useUsersCtx();
  const [text, setText]         = useState('');
  const [sendErr, setSendErr]   = useState<string | null>(null);
  const [graphMode, setGraphMode] = useState(true);
  const convoId  = chatId(me.uid, them.uid);
  const messages = useSelector((s: any) => s.chat.conversations[them.email] ?? []);
  const headsRef   = useRef<Heads>(makeHeads());
  const parentsRef = useRef<string[]>([]);   // heads snapshot at last keystroke

  useEffect(() => {
    headsRef.current   = makeHeads();
    parentsRef.current = [];
    actions.chat.setConversation(them.email, []);
    const q = query(collection(db, 'apps', appKey(), 'chats', convoId, 'messages'),
                    orderBy('timestamp', 'asc'), limitToLast(HISTORY_LIMIT));
    return onSnapshot(q,
      snap => {
        if (snap.metadata.fromCache && snap.docs.length === 0) return;
        const msgs = snap.docs.map((d: any) => {
          const data    = d.data();
          const parents = data.parents ?? [];
          updateHeads(headsRef.current, d.id, parents);
          return {
            id:        d.id,
            fromUid:   data.from      ?? '',
            fromEmail: data.fromEmail ?? '',
            text:      data.text      ?? '',
            timestamp: msgTimestamp(data, d.id),
            parents,
          };
        });
        actions.chat.setConversation(them.email, msgs);
      },
      err => setSendErr(`History unavailable: ${err.code}`),
    );
  }, [convoId, them.email]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    setSendErr(null);
    const id      = chatMsgId();
    const ts      = Date.now();
    const parents = parentsRef.current;   // captured at last keystroke, not now
    parentsRef.current = [];
    updateHeads(headsRef.current, id, parents);
    actions.chat.messageSent(them.email, {
      id, fromUid: me.uid, fromEmail: me.email ?? '', text: msg, timestamp: ts, parents,
    });
    try {
      await setDoc(doc(db, 'apps', appKey(), 'chats', convoId, 'messages', id), {
        from: me.uid, fromEmail: me.email ?? '', text: msg, timestamp: ts, parents,
      });
    } catch (e: any) {
      setSendErr(`Send failed: ${e?.code ?? e?.message ?? 'unknown error'}`);
    }
  }, [text, me.uid, me.email, convoId, them.email, db, actions]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    setSendErr(null);
    parentsRef.current = snapshotHeads(headsRef.current);  // freeze causal context at edit time
  }, []);

  return (
    <>
      <Toolbar>
        <ToggleBtn $active={graphMode} onClick={() => setGraphMode(m => !m)}>Graph</ToggleBtn>
      </Toolbar>
      {graphMode
        ? <GraphView messages={messages} myUid={me.uid} />
        : <MessageList messages={messages} myUid={me.uid} />}
      {sendErr && <ErrorBar>{sendErr}</ErrorBar>}
      <InputRow>
        <TextInput value={text} onChange={onChange}
          onKeyDown={onKey} placeholder={`Message ${them.displayName ?? them.email}…`} autoFocus />
        <SendBtn disabled={!text.trim()} onClick={send}>Send</SendBtn>
      </InputRow>
    </>
  );
};

// ── Group chat ────────────────────────────────────────────────────────────────

const ActiveGroupChat = ({ me, group }: { me: User; group: GroupChat }) => {
  const { db, actions, useSelector } = useUsersCtx();
  const [text, setText]           = useState('');
  const [sendErr, setSendErr]     = useState<string | null>(null);
  const [graphMode, setGraphMode] = useState(true);
  const messages = useSelector((s: any) => s.chat.conversations[group.id] ?? []);
  const headsRef   = useRef<Heads>(makeHeads());
  const parentsRef = useRef<string[]>([]);   // heads snapshot at last keystroke

  // History — skip for pending chats (no Firestore document yet)
  useEffect(() => {
    if (group.pending) return;
    headsRef.current   = makeHeads();
    parentsRef.current = [];
    actions.chat.setConversation(group.id, []);
    const q = query(collection(db, 'apps', appKey(), 'groupChats', group.id, 'messages'),
                    orderBy('timestamp', 'asc'), limitToLast(HISTORY_LIMIT));
    return onSnapshot(q,
      snap => {
        if (snap.metadata.fromCache && snap.docs.length === 0) return;
        const msgs = snap.docs.map((d: any) => {
          const data    = d.data();
          const parents = data.parents ?? [];
          updateHeads(headsRef.current, d.id, parents);
          return {
            id:        d.id,
            fromUid:   data.from      ?? '',
            fromEmail: data.fromEmail ?? '',
            text:      data.text      ?? '',
            timestamp: msgTimestamp(data, d.id),
            parents,
          };
        });
        actions.chat.setConversation(group.id, msgs);
      },
      err => setSendErr(`History unavailable: ${err.code}`),
    );
  }, [group.id, group.pending]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    setSendErr(null);
    const id      = chatMsgId();
    const ts      = Date.now();
    const parents = parentsRef.current;   // captured at last keystroke, not now
    parentsRef.current = [];
    updateHeads(headsRef.current, id, parents);

    const message: ChatMessage = {
      id, fromUid: me.uid, fromEmail: me.email ?? '', text: msg, timestamp: ts, parents,
    };
    actions.chat.groupMessageSent(group.id, message);

    try {
      if (group.pending) {
        const batch    = writeBatch(db);
        const groupRef = doc(db, 'apps', appKey(), 'groupChats', group.id);
        batch.set(groupRef, {
          participants:  group.participants,
          nickname:      group.nickname,
          createdBy:     group.createdBy,
          createdAt:     ts,
          lastMessageAt: ts,
        });
        batch.set(doc(db, 'apps', appKey(), 'groupChats', group.id, 'messages', id), {
          from: me.uid, fromEmail: me.email ?? '', text: msg, timestamp: ts, parents,
        });
        await batch.commit();
      } else {
        await setDoc(doc(db, 'apps', appKey(), 'groupChats', group.id, 'messages', id), {
          from: me.uid, fromEmail: me.email ?? '', text: msg, timestamp: ts, parents,
        });
        await setDoc(doc(db, 'apps', appKey(), 'groupChats', group.id),
          { lastMessageAt: ts }, { merge: true });
      }
    } catch (e: any) {
      setSendErr(`Send failed: ${e?.code ?? e?.message ?? 'unknown error'}`);
    }
  }, [text, me.uid, me.email, group, db, actions]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    setSendErr(null);
    parentsRef.current = snapshotHeads(headsRef.current);  // freeze causal context at edit time
  }, []);

  return (
    <>
      <Toolbar>
        <ToggleBtn $active={graphMode} onClick={() => setGraphMode(m => !m)}>Graph</ToggleBtn>
      </Toolbar>
      {graphMode
        ? <GraphView messages={messages} myUid={me.uid} showAvatars />
        : <MessageList messages={messages} myUid={me.uid} showAvatars />}
      {sendErr && <ErrorBar>{sendErr}</ErrorBar>}
      <InputRow>
        <TextInput value={text} onChange={onChange}
          onKeyDown={onKey} placeholder={`Message ${group.nickname}…`} autoFocus />
        <SendBtn disabled={!text.trim()} onClick={send}>Send</SendBtn>
      </InputRow>
    </>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────

type ChatProps = { me: User };

export const Chat = ({ me }: ChatProps) => {
  const { useSelector } = useUsersCtx();
  const active        = useSelector((s: any) => s.chat.active);
  const them          = active?.kind === '1-1'   ? active.user : null;
  const activeGroupId = active?.kind === 'group' ? active.id   : null;
  const group         = useSelector((s: any) =>
    activeGroupId ? (s.chat.groups.find((g: GroupChat) => g.id === activeGroupId) ?? null) : null
  );

  const renderHeader = () => {
    if (them) return (
      <>
        <HeaderLabel>Chat with:</HeaderLabel>
        <HeaderAvatar them={them} />
        {them.displayName ?? them.email}
      </>
    );
    if (group) return (
      <>
        <HeaderLabel>Chat with:</HeaderLabel>
        <GroupHeaderAvatars group={group} />
        {group.nickname}
        {group.pending && <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>(draft)</span>}
      </>
    );
    return 'Chat';
  };

  return (
    <Wrap>
      <Header>{renderHeader()}</Header>
      {them
        ? <ActiveChat me={me} them={them} />
        : group
          ? <ActiveGroupChat me={me} group={group} />
          : <Placeholder>Click a user or group to start chatting</Placeholder>
      }
    </Wrap>
  );
};
