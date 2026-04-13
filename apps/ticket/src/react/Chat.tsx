import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import styled from 'styled-components';
import { db } from '../firebase';
import { actions, useSelector } from '../actions-integration';
import { ChatMessage, UserRec } from '../actions/chat-slice';

const chatId = (a: string, b: string) => [a, b].sort().join('__');

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

const Bubble = styled.div<{ $mine: boolean }>`
  max-width: 80%;
  padding: 7px 11px;
  border-radius: 14px;
  font-size: 13px;
  align-self: ${p => p.$mine ? 'flex-end' : 'flex-start'};
  background: ${p => p.$mine ? '#1a73e8' : '#f1f3f4'};
  color: ${p => p.$mine ? 'white' : '#202124'};
  word-break: break-word;
`;

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

// ── Active conversation ───────────────────────────────────────────────────────

const ActiveChat = ({ me, them }: { me: User; them: UserRec }) => {
  const [text, setText] = useState('');
  const convoId         = chatId(me.uid, them.uid);
  const messages        = useSelector(s => s.chat.conversations[them.email] ?? []);
  const bottomRef       = useRef<HTMLDivElement>(null);

  useEffect(() => {
    actions.chat.setConversation(them.email, []);
    let initialLoad = true;
    const q     = query(collection(db, 'chats', convoId, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, snap => {
      if (initialLoad) {
        initialLoad = false;
        // Bulk-load history on first snapshot (setConversation keeps the log readable)
        actions.chat.setConversation(them.email, snap.docs.map(d => {
          const data = d.data();
          return {
            fromUid:   data.from      ?? '',
            fromEmail: data.fromEmail ?? '',
            text:      data.text      ?? '',
            timestamp: data.timestamp?.toMillis() ?? Date.now(),
          };
        }));
      } else {
        // Subsequent snapshots: only added docs from the other party
        // (own messages are already in state via messageSent)
        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          const data = change.doc.data();
          if (data.from === me.uid) return;
          actions.chat.messageReceived(them.email, {
            fromUid:   data.from      ?? '',
            fromEmail: data.fromEmail ?? '',
            text:      data.text      ?? '',
            timestamp: data.timestamp?.toMillis() ?? Date.now(),
          });
        });
      }
    });
    return unsub;
  }, [convoId, them.email, me.uid]);

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
        {messages.map((m, i) => (
          <Bubble key={i} $mine={m.fromUid === me.uid}>{m.text}</Bubble>
        ))}
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
      <Header>{them ? `Chat — ${them.displayName ?? them.email}` : 'Chat'}</Header>
      {them
        ? <ActiveChat me={me} them={them} />
        : <Placeholder>Click a user to start chatting</Placeholder>
      }
    </Wrap>
  );
};
