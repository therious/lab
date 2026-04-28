import React, { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useParams } from 'react-router-dom';
import { User } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import styled from 'styled-components';

import { Modalize, Navbar, AppLayout, AppBody, NavItem, NavDivider } from '@therious/components';
import { useSelector, actions } from './actions-integration';
import {
  UsersProvider, useSession, Login, AdminView, RoleGuard, UserBadge,
} from '@therious/users';
import { firebaseAuth, db } from './firebase';

// @ts-ignore - generated at build time by generate-build-info.js
import buildInfo from './build-info.json';

// ── App-specific layout pieces ────────────────────────────────────────────────

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

const AppCard = styled(NavItem)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 180px;
  height: 100px;
  border: 1px solid #dadce0;
  border-radius: 8px;
  color: #202124;
  font-size: 14px;
  font-weight: 500;
  background: white;
  padding: 0;
  &:hover { background: #f8f9fa; border-color: #1a73e8; color: #1a73e8; }
`;

const AppCardSub = styled.div`
  font-size: 11px;
  color: #5f6368;
  margin-top: 4px;
`;

// ── "Deployed Apps Only" toggle ───────────────────────────────────────────────

const ToggleWrap = styled.label`
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  color: #c5cae9;
`;

const ToggleTrack = styled.span<{ $on: boolean }>`
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: ${p => p.$on ? '#26a69a' : '#3949ab'};
  transition: background 0.2s;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: ${p => p.$on ? '16px' : '2px'};
    transition: left 0.2s;
  }
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const isLocalhost = (appId: string) => appId.includes('_');

// ── App route ─────────────────────────────────────────────────────────────────

const AppRoute = () => {
  const { appId } = useParams<{ appId: string }>();
  if (!appId) return null;
  const appName = appId.includes('_') ? appId.split('_')[0] : appId;
  return <AdminView appId={appId} appName={appName} />;
};

// ── Home screen ───────────────────────────────────────────────────────────────

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

// ── Authenticated shell ───────────────────────────────────────────────────────

const AuthenticatedApp = ({ session }: { session: User }) => {
  const [appIds, setAppIds] = useState<string[]>([]);
  const [deployedOnly, setDeployedOnly] = useState<boolean>(
    () => localStorage.getItem('admin:deployedOnly') === 'true'
  );
  const curPath = useLocation().pathname;

  const filteredAppIds = deployedOnly ? appIds.filter(id => !isLocalhost(id)) : appIds;

  const toggleDeployedOnly = () => {
    setDeployedOnly(prev => {
      localStorage.setItem('admin:deployedOnly', String(!prev));
      return !prev;
    });
  };

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

  const toggle = (
    <ToggleWrap>
      <HiddenCheckbox checked={deployedOnly} onChange={toggleDeployedOnly} />
      <ToggleTrack $on={deployedOnly} />
      Deployed only
    </ToggleWrap>
  );

  return (
    <UsersProvider db={db} auth={firebaseAuth} actions={actions} useSelector={useSelector} appName="admin">
      <RoleGuard roles={['admin']} fallback={noAccessFallback}>
        <AppLayout>
          <Navbar
            title="Admin"
            buildInfo={buildInfo}
            rightContent={
              <>
                {toggle}
                <NavDivider />
                <UserBadge />
              </>
            }
          >
            <NavItem to="/" $active={curPath === '/'}>Home</NavItem>
            {filteredAppIds.length > 0 && <NavDivider />}
            {filteredAppIds.map(appId => {
              const label = appId.includes('_') ? appId.split('_')[0] : appId;
              const port  = appId.includes('_') ? `:${appId.split('_')[1]}` : '';
              return (
                <NavItem key={appId} to={`/app/${appId}`} $active={curPath === `/app/${appId}`}>
                  {label}{port}
                </NavItem>
              );
            })}
          </Navbar>

          <AppBody>
            <Routes>
              <Route path="/"           element={<HomeScreen appIds={filteredAppIds} />} />
              <Route path="/app/:appId" element={<AppRoute />} />
            </Routes>
          </AppBody>
        </AppLayout>
      </RoleGuard>
    </UsersProvider>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────

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
