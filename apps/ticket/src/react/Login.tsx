import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import styled from 'styled-components';
import { firebaseAuth } from '../firebase';

const provider = new GoogleAuthProvider();

const LoginDiv = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
`;

const GoogleBtn = styled.button`
  display: flex;
  align-items: center;
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

export const Login = () => {
  const signIn = () => signInWithPopup(firebaseAuth, provider);
  return (
    <LoginDiv>
      <h2 style={{ margin: 0 }}>Ticket to Ride</h2>
      <GoogleBtn onClick={signIn}>
        Sign in with Google
      </GoogleBtn>
    </LoginDiv>
  );
};
