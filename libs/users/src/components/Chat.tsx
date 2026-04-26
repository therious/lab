import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, setDoc, writeBatch,
         query, orderBy, limitToLast, onSnapshot } from 'firebase/firestore';
import { appKey } from '../app-key';
import { User } from 'firebase/auth';
import styled from 'styled-components';
import { useUsersCtx } from '../context';
import { ChatMessage, UserRec, GroupChat, chatId, HISTORY_LIMIT } from '../slices/chat-slice';
import { chatMsgId, msgTimestamp, makeHeads, updateHeads, snapshotHeads, Heads } from '../slices/chat-id';
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

const BubbleWrap = styled.div<{ $mine: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${p => p.$mine ? 'flex-end' : 'flex-start'};
  align-self:  ${p => p.$mine ? 'flex-end' : 'flex-start'};
`;

const Bubble = styled.div<{ $mine: boolean }>`
  position: relative;
  max-width: 80%;
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
    right: ${p => p.$mine ? '-6px' : 'auto'};
    left:  ${p => p.$mine ? 'auto' : '-6px'};
    border-width: ${p => p.$mine ? '6px 0 6px 8px' : '6px 8px 6px 0'};
    border-color: ${p => p.$mine
      ? 'transparent transparent transparent #3c4043'
      : 'transparent #f1f3f4 transparent transparent'};
  }
`;

const BubbleTime = styled.div<{ $mine: boolean }>`
  font-size: 10px;
  color: #aaa;
  margin: 1px 4px 0;
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

// ── Shared avatar with status dot ────────────────────────────────────────────

type AvatarProps = {
  profile:  UserProfile | null;
  fallback: { email: string; displayName?: string };
  size?:    number;
};

const Avatar = ({ profile, fallback, size = 24 }: AvatarProps) => {
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

  if (profile?.photoURL) {
    return (
      <div style={wrap}>
        <img src={profile.photoURL} referrerPolicy="no-referrer" loading="lazy" alt=""
          style={{ width: size, height: size, borderRadius: '50%', display: 'block' }} />
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
            {showAvatars && !mine && (
              <SenderLabel>{profile?.displayName ?? m.fromEmail}</SenderLabel>
            )}
            <Bubble $mine={mine}>{m.text}</Bubble>
            <BubbleTime $mine={mine}>{time}</BubbleTime>
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
  const [text, setText]       = useState('');
  const [sendErr, setSendErr] = useState<string | null>(null);
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
      <MessageList messages={messages} myUid={me.uid} />
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
  const [text, setText]       = useState('');
  const [sendErr, setSendErr] = useState<string | null>(null);
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
      <MessageList messages={messages} myUid={me.uid} showAvatars />
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
