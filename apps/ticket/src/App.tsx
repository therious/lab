import { useLocation, Route, Routes } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';

import { Modalize }   from '@therious/components';
import { useSelector, actions } from './actions-integration';
import { UsersProvider, useSession, Login, UsersView } from '@therious/users';
import { firebaseAuth, db } from './firebase';

import { Game }        from './react/Game';
import { Layout, CenterBody, MyNavLink, Navbar } from './react/Navbar';
import { NotifyWrapper } from './react/NotifyWrapper';
import { TotalState }  from './actions/combined-slices';

const Profile = () => <>{`profile here`}</>;

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
              </Navbar>
              <CenterBody>
                <Routes>
                  <Route path="/"        element={<Game />} />
                  <Route path="/users"   element={<UsersView session={session} />} />
                  <Route path="/profile" element={<Profile />} />
                </Routes>
              </CenterBody>
            </Layout>
          </UsersProvider>
      }
    </SnackbarProvider>
  );
}
