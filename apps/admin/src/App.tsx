import React, { useEffect, useState } from 'react';
import { Route, Routes, NavLink, useLocation, useParams } from 'react-router-dom';
import { User } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import styled from 'styled-components';

import { Modalize } from '@therious/components';
import { useSelector, actions } from './actions-integration';
import {
  UsersProvider, useSession, Login, AdminView, RoleGuard,
} from '@therious/users';
import { firebaseAuth, db } from './firebase';

// ── Layout ────────────────────────────────────────────────────────────────────

const AppShell = styled.div`
  display: grid;
  height: 100vh;
  width: 100vw;
  grid-template-rows: 44px minmax(0, 1fr);
  grid-template-areas: "Navbar" "Body";
  box-sizing: border-box;
`;

const Navbar = styled.nav`
  grid-area: Navbar;
  background: #1a237e;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 4px;
`;

const NavTitle = styled.span`
  color: #e8eaf6;
  font-weight: bold;
  font-size: 15px;
  margin-right: 16px;
  letter-spacing: 0.03em;
`;

const NavDivider = styled.div`
  width: 1px;
  height: 20px;
  background: #3949ab;
  margin: 0 8px;
`;

const StyledLink = styled(NavLink)<{ $active?: boolean }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  color: ${p => p.$active ? '#fff' : '#c5cae9'};
  background: ${p => p.$active ? '#3949ab' : 'transparent'};
  text-decoration: none;
  &:hover { background: #283593; color: #fff; }
`;

const Body = styled.main`
  grid-area: Body;
  overflow: hidden;
`;

const CenterMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #5f6368;
`;

const AppGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 32px;
`;

const AppCard = styled(NavLink)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 180px;
  height: 100px;
  border: 1px solid #dadce0;
  border-radius: 8px;
  text-decoration: none;
  color: #202124;
  font-size: 14px;
  font-weight: 500;
  background: white;
  &:hover { background: #f8f9fa; border-color: #1a73e8; color: #1a73e8; }
`;

const AppCardSub = styled.div`
  font-size: 11px;
  color: #5f6368;
  margin-top: 4px;
`;

// ── App route — renders AdminView for a specific appId from the URL param ─────

const AppRoute = () => {
  const { appId } = useParams<{ appId: string }>();
  if (!appId) return null;
  // Derive a human-readable app name from the appId for the role input placeholder
  // e.g. "localhost_5173" → "localhost", "myapp.com" → "myapp.com"
  const appName = appId.includes('_') ? appId.split('_')[0] : appId;
  return <AdminView appId={appId} appName={appName} />;
};

// ── Home screen — grid of discovered app cards ────────────────────────────────

const HomeScreen = ({ appIds }: { appIds: string[] }) => {
  if (appIds.length === 0) {
    return (
      <CenterMessage>
        <div>No apps discovered yet.</div>
        <div style={{ fontSize: 12 }}>Apps register themselves when a user logs in.</div>
      </CenterMessage>
    );
  }
  return (
    <AppGrid>
      {appIds.map(appId => {
        const label = appId.includes('_') ? appId.split('_')[0] : appId;
        const port  = appId.includes('_') ? appId.split('_')[1] : null;
        return (
          <AppCard key={appId} to={`/app/${appId}`}>
            {label}
            {port && <AppCardSub>:{port}</AppCardSub>}
          </AppCard>
        );
      })}
    </AppGrid>
  );
};

// ── Authenticated shell — loads app list, renders nav + routes ─────────────

const AuthenticatedApp = ({ session }: { session: User }) => {
  const [appIds, setAppIds] = useState<string[]>([]);
  const curPath = useLocation().pathname;

  useEffect(() => {
    getDocs(collection(db, 'apps'))
      .then(snap => setAppIds(snap.docs.map(d => d.id).sort()))
      .catch(err => console.error('[admin] failed to load apps:', err));
  }, []);

  const noAccessFallback = (
    <CenterMessage>
      <div style={{ fontSize: 18, fontWeight: 500 }}>Admin access required</div>
      <div style={{ fontSize: 13 }}>Your account does not have the <code>*:admin</code> role.</div>
    </CenterMessage>
  );

  return (
    <UsersProvider db={db} auth={firebaseAuth} actions={actions} useSelector={useSelector}>
      <RoleGuard roles={['*:admin']} fallback={noAccessFallback}>
        <AppShell>
          <Navbar>
            <NavTitle>Admin</NavTitle>
            <StyledLink to="/" $active={curPath === '/'}>Home</StyledLink>
            {appIds.length > 0 && <NavDivider />}
            {appIds.map(appId => {
              const label = appId.includes('_') ? appId.split('_')[0] : appId;
              const port  = appId.includes('_') ? `:${appId.split('_')[1]}` : '';
              return (
                <StyledLink
                  key={appId}
                  to={`/app/${appId}`}
                  $active={curPath === `/app/${appId}`}
                >
                  {label}{port}
                </StyledLink>
              );
            })}
          </Navbar>

          <Body>
            <Routes>
              <Route path="/"           element={<HomeScreen appIds={appIds} />} />
              <Route path="/app/:appId" element={<AppRoute />} />
            </Routes>
          </Body>
        </AppShell>
      </RoleGuard>
    </UsersProvider>
  );
};

// ── Root — handles loading / auth states ──────────────────────────────────────

export default function App() {
  const [session, , loading] = useSession(firebaseAuth, db, actions);

  if (loading) return null;

  if (!session) {
    return (
      <Modalize $maxWidth="320px">
        <Login auth={firebaseAuth} />
      </Modalize>
    );
  }

  return <AuthenticatedApp session={session} />;
}
