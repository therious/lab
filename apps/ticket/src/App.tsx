import { useCallback } from 'react';
import { useLocation, Route, Routes, useNavigate } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';

import { Modalize }   from '@therious/components';
import { useSelector, actions } from './actions-integration';
import { UsersProvider, useSession, signout, Login, UsersView } from '@therious/users';
import { firebaseAuth, db } from './firebase';

import { Game }        from './react/Game';
import { Layout, CenterBody, MyNavLink, Navbar } from './react/Navbar';
import { NotifyWrapper } from './react/NotifyWrapper';
import { TotalState }  from './actions/combined-slices';

const Profile = () => <>{`profile here`}</>;

const Signout = () => {
  const navigate = useNavigate();
  const cb = useCallback(async () => {
    await signout(firebaseAuth, db);
    navigate('/');
  }, [navigate]);

  return (
    <Modalize $maxWidth="350px">
      <h1>Signout?</h1>
      <hr />
      <button onClick={cb}>Signout</button>
    </Modalize>
  );
};

export default function App() {
  const [session, _] = useSession(firebaseAuth, db, actions);
  const curPath = useLocation().pathname;

  return (
    <SnackbarProvider maxSnack={5} hideIconVariant
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
      <NotifyWrapper />
      {!session
        ? <Modalize $maxWidth="320px"><Login auth={firebaseAuth} /></Modalize>
        : <UsersProvider db={db} auth={firebaseAuth} actions={actions} useSelector={useSelector}>
            <Layout>
              <Navbar>
                <MyNavLink curPath={curPath} to="/">Game</MyNavLink>
                <MyNavLink curPath={curPath} to="/users">Users</MyNavLink>
                <MyNavLink curPath={curPath} to="/profile">Profile</MyNavLink>
                <MyNavLink curPath={curPath} to="/signout">Signout</MyNavLink>
              </Navbar>
              <CenterBody>
                <Routes>
                  <Route path="/"        element={<Game />} />
                  <Route path="/users"   element={<UsersView session={session} />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/signout" element={<Signout />} />
                </Routes>
              </CenterBody>
            </Layout>
          </UsersProvider>
      }
    </SnackbarProvider>
  );
}
