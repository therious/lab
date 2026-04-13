import { useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendSignInLinkToEmail, signInWithEmailLink, isSignInWithEmailLink,
} from 'firebase/auth';
import styled from 'styled-components';
import { firebaseAuth } from '../firebase';

const EMAIL_KEY = 'ticket:emailForSignIn';

const actionCodeSettings = {
  url: window.location.origin,
  handleCodeInApp: true,
};

// ── Styled components ────────────────────────────────────────────────────────

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 8px 0;
  min-width: 280px;
`;

const Title = styled.h2`margin: 0 0 4px; text-align: center;`;

const GoogleBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 24px;
  font-size: 15px;
  background: white;
  color: #3c4043;
  border: 1px solid #dadce0;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  &:hover { background: #f8f8f8; border-color: #c0c0c0; }
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #888;
  font-size: 13px;
  &::before, &::after { content: ''; flex: 1; border-top: 1px solid #ddd; }
`;

const Tabs = styled.div`display: flex; border: 1px solid #dadce0; border-radius: 4px; overflow: hidden;`;
const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 7px;
  font-size: 13px;
  border: none;
  cursor: pointer;
  background: ${p => p.$active ? '#1a73e8' : 'white'};
  color: ${p => p.$active ? 'white' : '#3c4043'};
  &:hover { background: ${p => p.$active ? '#1a73e8' : '#f8f8f8'}; }
`;

const Input = styled.input`
  padding: 9px 12px;
  font-size: 14px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
  &:focus { border-color: #1a73e8; }
`;

const PrimaryBtn = styled.button`
  padding: 9px;
  font-size: 14px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: default; }
  &:not(:disabled):hover { background: #1558b0; }
`;

const SecondaryBtn = styled.button`
  padding: 9px;
  font-size: 13px;
  background: white;
  color: #1a73e8;
  border: 1px solid #dadce0;
  border-radius: 4px;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: default; }
  &:not(:disabled):hover { background: #f0f6ff; }
`;

const Msg = styled.p<{ $error?: boolean }>`
  margin: 0;
  font-size: 13px;
  font-style: italic;
  color: ${p => p.$error ? '#c62828' : '#2e7d32'};
  text-align: center;
`;

// ── Component ────────────────────────────────────────────────────────────────

type Mode = 'password' | 'link';

export const Login = () => {
  const [mode, setMode]       = useState<Mode>('password');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg]         = useState('');
  const [isError, setIsError] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const ok   = (text: string) => { setMsg(text); setIsError(false); };
  const fail = (text: string) => { setMsg(text); setIsError(true);  };

  // Complete magic-link sign-in when user returns from email link
  useEffect(() => {
    if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) return;
    const saved = localStorage.getItem(EMAIL_KEY) ?? window.prompt('Confirm your email:') ?? '';
    signInWithEmailLink(firebaseAuth, saved, window.location.href)
      .then(() => {
        localStorage.removeItem(EMAIL_KEY);
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch(e => fail(e.message));
  }, []);

  const signInGoogle = useCallback(() =>
    signInWithPopup(firebaseAuth, new GoogleAuthProvider()).catch(e => fail(e.message)), []);

  const signInPassword = useCallback(async () => {
    try { await signInWithEmailAndPassword(firebaseAuth, email, password); }
    catch(e: any) { fail(e.message); }
  }, [email, password]);

  const createAccount = useCallback(async () => {
    try { await createUserWithEmailAndPassword(firebaseAuth, email, password); }
    catch(e: any) { fail(e.message); }
  }, [email, password]);

  const sendLink = useCallback(async () => {
    try {
      await sendSignInLinkToEmail(firebaseAuth, email, actionCodeSettings);
      localStorage.setItem(EMAIL_KEY, email);
      setLinkSent(true);
      ok(`Link sent to ${email} — check your inbox.`);
    } catch(e: any) { fail(e.message); }
  }, [email]);

  const hasEmail    = email.trim().length > 0;
  const hasPassword = password.length > 0;

  return (
    <Wrap>
      <Title>Ticket to Ride</Title>

      <GoogleBtn onClick={signInGoogle}>Sign in with Google</GoogleBtn>

      <Divider>or sign in with email</Divider>

      <Tabs>
        <Tab $active={mode === 'password'} onClick={() => setMode('password')}>Password</Tab>
        <Tab $active={mode === 'link'}     onClick={() => setMode('link')}>Email link</Tab>
      </Tabs>

      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoFocus
      />

      {mode === 'password' && <>
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && hasEmail && hasPassword && signInPassword()}
        />
        <PrimaryBtn   disabled={!hasEmail || !hasPassword} onClick={signInPassword}>Sign in</PrimaryBtn>
        <SecondaryBtn disabled={!hasEmail || !hasPassword} onClick={createAccount}>Create account</SecondaryBtn>
      </>}

      {mode === 'link' && <>
        <PrimaryBtn disabled={!hasEmail || linkSent} onClick={sendLink}>
          {linkSent ? 'Link sent — check your inbox' : 'Send sign-in link'}
        </PrimaryBtn>
      </>}

      {msg && <Msg $error={isError}>{msg}</Msg>}
    </Wrap>
  );
};
