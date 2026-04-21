import { useLocation } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { User } from 'firebase/auth';

import { Modalize } from '@therious/components';
import { useSelector, actions } from './actions-integration';
import {
  UsersProvider, useSession, Login, UsersView, AdminView,
  RouteConfig, GuardedRoutes, useAccessibleRoutes, Foyer,
} from '@therious/users';
import { firebaseAuth, db } from './firebase';

import { Game }        from './react/Game';
import { Layout, CenterBody, MyNavLink, Navbar } from './react/Navbar';
import { NotifyWrapper } from './react/NotifyWrapper';

const Profile = () => <>{`profile here`}</>;

// Route table — single source of truth for nav visibility and routing.
// roles omitted = no restriction (any logged-in user can access).
// Add a roles array to protect a route: roles: ['ticket:player']
const makeRoutes = (session: User): RouteConfig[] => [
  { path: '/',        label: 'Game',    element: <Foyer><Game /></Foyer> },
  { path: '/users',   label: 'Users',   element: <UsersView session={session} /> },
  { path: '/profile', label: 'Profile', element: <Profile /> },
  { path: '/admin',   label: 'Admin',   roles: ['admin'], element: <AdminView /> },
];

const AuthenticatedApp = ({ session }: { session: User }) => {
  const curPath = useLocation().pathname;
  const routes  = makeRoutes(session);
  const visible = useAccessibleRoutes(routes);

  return (
    <Layout>
      <Navbar>
        {visible.map(r => (
          <MyNavLink key={r.path} curPath={curPath} to={r.path}>{r.label}</MyNavLink>
        ))}
      </Navbar>
      <CenterBody>
        <GuardedRoutes routes={routes} />
      </CenterBody>
    </Layout>
  );
};

export default function App() {
  const [session, , loading] = useSession(firebaseAuth, db, actions);

  return (
    <SnackbarProvider maxSnack={5} hideIconVariant
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
      <NotifyWrapper />
      {loading
        ? null
        : !session
        ? <Modalize $maxWidth="320px"><Login auth={firebaseAuth} /></Modalize>
        : <UsersProvider db={db} auth={firebaseAuth} actions={actions} useSelector={useSelector} appName="ticket">
            <AuthenticatedApp session={session} />
          </UsersProvider>
      }
    </SnackbarProvider>
  );
}
