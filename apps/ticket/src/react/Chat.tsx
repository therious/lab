import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, query, orderBy, limitToLast, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import styled from 'styled-components';
import { db } from '../firebase';
import { actions, useSelector } from '../actions-integration';
import { ChatMessage, UserRec, chatId, HISTORY_LIMIT } from '../actions/chat-slice';
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

// ── Header avatar ────────────────────────────────────────────────────────────

const HeaderAvatar = ({ them }: { them: UserRec }) => {
  const photoURL = useSelector(s => s.users.list.find(u => u.uid === them.uid)?.photoURL ?? null);
  if (photoURL) {
    return (
      <img src={photoURL} referrerPolicy="no-referrer" loading="lazy"
        style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
    );
  }
  const initial = (them.displayName || them.email || '?')[0].toUpperCase();
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%', background: hashColor(them.email),
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, flexShrink: 0,
    }}>
      {initial}
    </div>
  );
};

// ── Active conversation ───────────────────────────────────────────────────────

const ActiveChat = ({ me, them }: { me: User; them: UserRec }) => {
  const [text, setText] = useState('');
  const convoId         = chatId(me.uid, them.uid);
  const messages        = useSelector(s => s.chat.conversations[them.email] ?? []);
  const bottomRef       = useRef<HTMLDivElement>(null);

  // Keep conversation in sync with Firestore.
  // Skip the initial empty cache-miss snapshot the SDK fires before server data arrives —
  // that was setting a "loaded" flag too early and discarding the real history.
  // Always calling setConversation on real snapshots is safe: it replaces the whole array,
  // so background-listener messageReceived entries are superseded without duplication.
  useEffect(() => {
    actions.chat.setConversation(them.email, []);
    const q     = query(collection(db, 'chats', convoId, 'messages'), orderBy('timestamp', 'asc'), limitToLast(HISTORY_LIMIT));
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    actions.chat.messageSent(them.email, {
      fromUid:   me.uid,
      fromEmail: me.email ?? '',
      text:      msg,
      timestamp: Date.now(),
    });
    await addDoc(collection(db, 'chats', convoId, 'messages'), {
      from:      me.uid,
      fromEmail: me.email ?? '',
      text:      msg,
      timestamp: serverTimestamp(),
    });
  }, [text, me.uid, me.email, convoId, them.email]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  return (
    <>
      <Messages>
        {messages.map((m, i) => {
          const mine    = m.fromUid === me.uid;
          const time    = new Date(m.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const showSep = i === 0 || toDateKey(messages[i - 1].timestamp) !== toDateKey(m.timestamp);
          const dateLabel = new Date(m.timestamp).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
          return (
            <React.Fragment key={i}>
              {showSep && <DateSep>{dateLabel}</DateSep>}
              <BubbleWrap $mine={mine}>
                <Bubble $mine={mine}>{m.text}</Bubble>
                <BubbleTime $mine={mine}>{time}</BubbleTime>
              </BubbleWrap>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </Messages>
      <InputRow>
        <TextInput
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={`Message ${them.displayName ?? them.email}…`}
          autoFocus
        />
        <SendBtn disabled={!text.trim()} onClick={send}>Send</SendBtn>
      </InputRow>
    </>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────

// Chat reads who it is talking to from the slice — no `them` prop needed
type ChatProps = { me: User };

export const Chat = ({ me }: ChatProps) => {
  const them = useSelector(s => s.chat.chattingWith);

  return (
    <Wrap>
      <Header>
        {them ? (
          <>
            <HeaderLabel>Chat with:</HeaderLabel>
            <HeaderAvatar them={them} />
            {them.displayName ?? them.email}
          </>
        ) : 'Chat'}
      </Header>
      {them
        ? <ActiveChat me={me} them={them} />
        : <Placeholder>Click a user to start chatting</Placeholder>
      }
    </Wrap>
  );
};
