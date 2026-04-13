import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, doc, setDoc, writeBatch,
         query, orderBy, limitToLast, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import styled from 'styled-components';
import { db } from '../firebase';
import { actions, useSelector } from '../actions-integration';
import { ChatMessage, UserRec, GroupChat, ChatTarget, targetKey, chatId, HISTORY_LIMIT } from '../actions/chat-slice';
import { UserProfile } from '../actions/users-slice';
import { hashColor } from './avatar-utils';

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

// ── Shared message list renderer ──────────────────────────────────────────────

const MessageList = ({ messages, myUid, showSender = false }:
    { messages: ChatMessage[]; myUid: string; showSender?: boolean }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
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
        return (
          <React.Fragment key={i}>
            {showSep && <DateSep>{dateLabel}</DateSep>}
            <BubbleWrap $mine={mine}>
              {showSender && !mine && <SenderLabel>{m.fromEmail}</SenderLabel>}
              <Bubble $mine={mine}>{m.text}</Bubble>
              <BubbleTime $mine={mine}>{time}</BubbleTime>
            </BubbleWrap>
          </React.Fragment>
        );
      })}
      <div ref={bottomRef} />
    </Messages>
  );
};

// ── Header avatars ────────────────────────────────────────────────────────────

const SmallAvatar = ({ profile }: { profile: UserProfile }) => {
  if (profile.photoURL) {
    return <img src={profile.photoURL} referrerPolicy="no-referrer" loading="lazy"
      style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />;
  }
  const initial = (profile.displayName || profile.email || '?')[0].toUpperCase();
  return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: hashColor(profile.email),
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, flexShrink: 0 }}>
      {initial}
    </div>
  );
};

const HeaderAvatar = ({ them }: { them: UserRec }) => {
  const profile = useSelector(s => s.users.list.find(u => u.uid === them.uid));
  if (!profile) {
    const initial = (them.displayName || them.email || '?')[0].toUpperCase();
    return (
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: hashColor(them.email),
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, flexShrink: 0 }}>
        {initial}
      </div>
    );
  }
  return <SmallAvatar profile={profile} />;
};

const GroupHeaderAvatars = ({ group }: { group: GroupChat }) => {
  const myUid    = useSelector(s => s.chat.me?.uid);
  const allUsers = useSelector(s => s.users.list);
  const profiles = group.participants
    .filter(uid => uid !== myUid)
    .map(uid => allUsers.find(u => u.uid === uid))
    .filter(Boolean)
    .slice(0, 3) as UserProfile[];

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {profiles.map(p => <SmallAvatar key={p.uid} profile={p} />)}
    </div>
  );
};

// ── 1-1 chat ─────────────────────────────────────────────────────────────────

const ActiveChat = ({ me, them }: { me: User; them: UserRec }) => {
  const [text, setText] = useState('');
  const convoId  = chatId(me.uid, them.uid);
  const messages = useSelector(s => s.chat.conversations[them.email] ?? []);

  useEffect(() => {
    actions.chat.setConversation(them.email, []);
    const q     = query(collection(db, 'chats', convoId, 'messages'),
                        orderBy('timestamp', 'asc'), limitToLast(HISTORY_LIMIT));
    const unsub = onSnapshot(q, snap => {
      if (snap.metadata.fromCache && snap.docs.length === 0) return;
      actions.chat.setConversation(them.email, snap.docs.map(d => {
        const data = d.data();
        return {
          fromUid:   data.from      ?? '',
          fromEmail: data.fromEmail ?? '',
          text:      data.text      ?? '',
          timestamp: data.timestamp?.toMillis() ?? Date.now(),
        };
      }));
    });
    return unsub;
  }, [convoId, them.email]);

  const send = useCallback(async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    actions.chat.messageSent(them.email, {
      fromUid: me.uid, fromEmail: me.email ?? '', text: msg, timestamp: Date.now(),
    });
    await addDoc(collection(db, 'chats', convoId, 'messages'), {
      from: me.uid, fromEmail: me.email ?? '', text: msg, timestamp: serverTimestamp(),
    });
  }, [text, me.uid, me.email, convoId, them.email]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  return (
    <>
      <MessageList messages={messages} myUid={me.uid} />
      <InputRow>
        <TextInput value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey}
          placeholder={`Message ${them.displayName ?? them.email}…`} autoFocus />
        <SendBtn disabled={!text.trim()} onClick={send}>Send</SendBtn>
      </InputRow>
    </>
  );
};

// ── Group chat ────────────────────────────────────────────────────────────────

const ActiveGroupChat = ({ me, group }: { me: User; group: GroupChat }) => {
  const [text, setText] = useState('');
  const messages = useSelector(s => s.chat.conversations[group.id] ?? []);

  // History — skip for pending chats (no Firestore document yet)
  useEffect(() => {
    if (group.pending) return;
    actions.chat.setConversation(group.id, []);
    const q     = query(collection(db, 'groupChats', group.id, 'messages'),
                        orderBy('timestamp', 'asc'), limitToLast(HISTORY_LIMIT));
    const unsub = onSnapshot(q, snap => {
      if (snap.metadata.fromCache && snap.docs.length === 0) return;
      actions.chat.setConversation(group.id, snap.docs.map(d => {
        const data = d.data();
        return {
          fromUid:   data.from      ?? '',
          fromEmail: data.fromEmail ?? '',
          text:      data.text      ?? '',
          timestamp: data.timestamp?.toMillis() ?? Date.now(),
        };
      }));
    });
    return unsub;
  }, [group.id, group.pending]);

  const send = useCallback(async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');

    const message: ChatMessage = {
      fromUid: me.uid, fromEmail: me.email ?? '', text: msg, timestamp: Date.now(),
    };
    actions.chat.groupMessageSent(group.id, message); // optimistic + clears pending flag

    if (group.pending) {
      // First message — atomically create the group doc + first message
      const batch    = writeBatch(db);
      const groupRef = doc(db, 'groupChats', group.id);
      batch.set(groupRef, {
        participants:  group.participants,
        nickname:      group.nickname,
        createdBy:     group.createdBy,
        createdAt:     serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
      const msgRef = doc(collection(db, 'groupChats', group.id, 'messages'));
      batch.set(msgRef, {
        from: me.uid, fromEmail: me.email ?? '', text: msg, timestamp: serverTimestamp(),
      });
      await batch.commit();
    } else {
      await addDoc(collection(db, 'groupChats', group.id, 'messages'), {
        from: me.uid, fromEmail: me.email ?? '', text: msg, timestamp: serverTimestamp(),
      });
      await setDoc(doc(db, 'groupChats', group.id),
        { lastMessageAt: serverTimestamp() }, { merge: true });
    }
  }, [text, me.uid, me.email, group]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  return (
    <>
      <MessageList messages={messages} myUid={me.uid} showSender />
      <InputRow>
        <TextInput value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey}
          placeholder={`Message ${group.nickname}…`} autoFocus />
        <SendBtn disabled={!text.trim()} onClick={send}>Send</SendBtn>
      </InputRow>
    </>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────

type ChatProps = { me: User };

export const Chat = ({ me }: ChatProps) => {
  const active        = useSelector(s => s.chat.active);
  const them          = active?.kind === '1-1'    ? active.user : null;
  const activeGroupId = active?.kind === 'group'  ? active.id   : null;
  const group         = useSelector(s =>
    activeGroupId ? (s.chat.groups.find(g => g.id === activeGroupId) ?? null) : null
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
