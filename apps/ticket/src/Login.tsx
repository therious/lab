import React, { useState, useCallback } from 'react';
import { createClient, AuthResponse, AuthTokenResponsePassword, AuthUser, AuthError
 } from '@supabase/supabase-js';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import {styled} from 'styled-components'
// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPA_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPA_ANON_KEY;
const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITEKEY
const redirectTo = import.meta.env.VITE_SUPA_REDIRECT_URL;
const {auth} = createClient(supabaseUrl, supabaseAnonKey);

const LoginDiv = styled.div`
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px 10px ;
`;
const Button = styled.button`margin: 0;`;
const Input = styled.input`margin: 0;`;


type AdviceLevel = 'error'|'success'|'warning'|'info';
type AdviceType =[msg:string, level:AdviceLevel];

const messages:Record<string, AdviceType> =
{
      cleared:  ['', 'success'],
  needcaptcha:  ['Please complete the CAPTCHA challenge.', 'error'],
   goodSignup:  ['Signup successful! Check your email to confirm.','success'],
    goodReset:  ['Password reset email sent.','success'],
} as const;

const adviceColors:Record<AdviceLevel, string> = {
  error: 'red',
  success: 'green',
  warning: 'orange',
  info: 'blue'
};


type AdviceProps = { $advice:AdviceType};

const Advice = ({ $advice }:AdviceProps) => {

  const [msg, level] = $advice;
  return (
    <small style={{display: 'block', marginTop: '-8px', flexBasis: '100%', textAlign:'left', fontStyle:'italic', color:adviceColors[level]}}>
      {msg}
    </small>
  );
}

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [advice, setAdvice] = useState<AdviceType>(messages.cleared);

  const advSetter = (advice:AdviceType) =>
  {
    console.log(`setting advice to level:${advice[1]} msg:${advice[0]}`);
    setAdvice(advice);
  }

  const clearErrmsg = useCallback(() => advSetter(messages.cleared), []);



  const handlerPrelude = (e:React.MouseEvent) =>
  {
    e.preventDefault();
    if (!captchaToken) advSetter(messages.needCaptcha);
    return !captchaToken;
  };

  const login = async (e:React.MouseEvent) => {
    if(handlerPrelude(e)) return;
    const { error } = await auth.signInWithPassword({ email, password, options:{captchaToken} });
    if(error) advSetter([error.message,'error']);
  };

  const signup = async (e:React.MouseEvent) => {
    if(handlerPrelude(e)) return;

    const { error } = await auth.signUp({ email, password, options:{captchaToken,emailRedirectTo:redirectTo}});
    if(error) advSetter([error.message,'error']);
    else advSetter(messages.goodSignup);
  };

  const reset = async (e:React.MouseEvent) => {
    if(handlerPrelude(e)) return;

    const { error } = await auth.resetPasswordForEmail(email, {captchaToken, redirectTo});
    if(error) advSetter([error.message,'error']);
    else advSetter(messages.goodReset);
  };


  const onHCaptchaVerify = (token: string) => {clearErrmsg(); setCaptchaToken(token);}
  const mayAnything = email.length > 0 && captchaToken;
  const mayLogin = mayAnything && password.length;

  return (
    <LoginDiv>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"/>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"/>
        <div style={{flexBasis: '100%',
          display: 'flex', flexDirection: 'row', flexGrow: 1, flexWrap: 'wrap',
          justifyContent: 'center'}}>
          <HCaptcha sitekey={captchaSiteKey} onVerify={onHCaptchaVerify}/>
        </div>
        <Advice $advice={advice}/>
        <Button disabled={!mayLogin}    onClick={login} >Login             </Button>
        <Button disabled={!mayAnything} onClick={reset} >Reset Password    </Button>
        <Button disabled={!mayAnything} onClick={signup}>Create New Account</Button>
    </LoginDiv>
  );
};

