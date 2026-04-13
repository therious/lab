import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import styled from 'styled-components';
import { db } from '../firebase';

export type UserRec = { uid: string; displayName: string; email: string; };

type Message = { from: string; text: string; };

const chatId = (a: string, b: string) => [a, b].sort().join('__');

// ── Styles ───────────────────────────────────────────────────────────────────

const Panel = styled.div`
  position: fixed;
  right: 0; bottom: 0;
  width: 320px; height: 420px;
  background: white;
  border: 1px solid #dadce0;
  border-radius: 8px 0 0 0;
  box-shadow: -2px -2px 8px rgba(0,0,0,0.18);
  display: flex; flex-direction: column;
  z-index: 1000;
`;

const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px;
  background: #1a73e8; color: white;
  border-radius: 8px 0 0 0;
  font-weight: bold; font-size: 14px;
`;

const CloseBtn = styled.button`
  background: none; border: none; color: white;
  font-size: 20px; cursor: pointer; line-height: 1; padding: 0;
`;

const Messages = styled.div`
  flex: 1; overflow-y: auto;
  padding: 10px;
  display: flex; flex-direction: column; gap: 6px;
`;

const Bubble = styled.div<{ $mine: boolean }>`
  max-width: 80%; padding: 7px 11px;
  border-radius: 14px; font-size: 13px;
  align-self: ${p => p.$mine ? 'flex-end' : 'flex-start'};
  background: ${p => p.$mine ? '#1a73e8' : '#f1f3f4'};
  color: ${p => p.$mine ? 'white' : '#202124'};
  word-break: break-word;
`;

const InputRow = styled.div`
  display: flex; padding: 8px; gap: 6px;
  border-top: 1px solid #eee;
`;

const TextInput = styled.input`
  flex: 1; padding: 7px 12px;
  border: 1px solid #dadce0; border-radius: 20px;
  font-size: 13px; outline: none; font-family: inherit;
  &:focus { border-color: #1a73e8; }
`;

const SendBtn = styled.button`
  padding: 7px 14px;
  background: #1a73e8; color: white;
  border: none; border-radius: 20px;
  cursor: pointer; font-size: 13px;
  &:disabled { opacity: 0.45; cursor: default; }
  &:not(:disabled):hover { background: #1558b0; }
`;

// ── Component ────────────────────────────────────────────────────────────────

type ChatProps = { me: User; them: UserRec; onClose: () => void; };

export const Chat = ({ me, them, onClose }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText]         = useState('');
  const bottomRef               = useRef<HTMLDivElement>(null);
  const convoId                 = chatId(me.uid, them.uid);

  useEffect(() => {
    const q    = query(collection(db, 'chats', convoId, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, snap => setMessages(snap.docs.map(d => d.data() as Message)));
    return unsub;
  }, [convoId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    await addDoc(collection(db, 'chats', convoId, 'messages'), {
      from: me.uid, text: msg, timestamp: serverTimestamp(),
    });
  }, [text, me.uid, convoId]);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  const label = them.displayName ?? them.email;

  return (
    <Panel>
      <Header>
        <span>Chat — {label}</span>
        <CloseBtn onClick={onClose}>×</CloseBtn>
      </Header>
      <Messages>
        {messages.map((m, i) => (
          <Bubble key={i} $mine={m.from === me.uid}>{m.text}</Bubble>
        ))}
        <div ref={bottomRef} />
      </Messages>
      <InputRow>
        <TextInput
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={`Message ${label}…`}
          autoFocus
        />
        <SendBtn disabled={!text.trim()} onClick={send}>Send</SendBtn>
      </InputRow>
    </Panel>
  );
};
