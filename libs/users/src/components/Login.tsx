import { useState, useEffect, useCallback } from 'react';
import {
  signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendSignInLinkToEmail, signInWithEmailLink, isSignInWithEmailLink,
  Auth,
} from 'firebase/auth';
import styled from 'styled-components';

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

const RadioGroup = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 14px;
  color: #3c4043;
`;

const RadioLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
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

export const Login = ({ auth }: { auth: Auth }) => {
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
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    const saved = localStorage.getItem(EMAIL_KEY) ?? window.prompt('Confirm your email:') ?? '';
    signInWithEmailLink(auth, saved, window.location.href)
      .then(() => {
        localStorage.removeItem(EMAIL_KEY);
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch(e => fail(e.message));
  }, [auth]);

  const signInGoogle = useCallback(() =>
    signInWithPopup(auth, new GoogleAuthProvider()).catch(e => fail(e.message)), [auth]);

  const signInPassword = useCallback(async () => {
    try { await signInWithEmailAndPassword(auth, email, password); }
    catch(e: any) { fail(e.message); }
  }, [auth, email, password]);

  const createAccount = useCallback(async () => {
    try { await createUserWithEmailAndPassword(auth, email, password); }
    catch(e: any) { fail(e.message); }
  }, [auth, email, password]);

  const sendLink = useCallback(async () => {
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      localStorage.setItem(EMAIL_KEY, email);
      setLinkSent(true);
      ok(`Link sent to ${email} — check your inbox.`);
    } catch(e: any) { fail(e.message); }
  }, [auth, email]);

  const hasEmail    = email.trim().length > 0;
  const hasPassword = password.length > 0;

  return (
    <Wrap>
      <Title>Ticket to Ride</Title>

      <GoogleBtn onClick={signInGoogle}>Sign in with Google</GoogleBtn>

      <Divider>or sign in via</Divider>

      <RadioGroup>
        <RadioLabel>
          <input type="radio" name="mode" value="password"
            checked={mode === 'password'} onChange={() => setMode('password')} />
          Password
        </RadioLabel>
        <RadioLabel>
          <input type="radio" name="mode" value="link"
            checked={mode === 'link'} onChange={() => setMode('link')} />
          Emailed link
        </RadioLabel>
      </RadioGroup>

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
