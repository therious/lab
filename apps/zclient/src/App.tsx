import React, { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';

import {
  AppLayout, AppBody,
  Navbar, NavItem, NavItemDisabled, NavDivider, NavToggle, Modalize,
} from '@therious/components';
import {
  Login, UserBadge, GuardedRoutes,
  useSession, useNavRoutes,
} from '@therious/users';
import type { RouteConfig } from '@therious/users';
import { useUsersCtx } from '@therious/users/src/context';

import { TradesView }  from './views/TradesView';
import { QuotesView }  from './views/QuotesView';
import { PartiesView } from './views/PartiesView';
import { UsersView }   from '@therious/users';

// @ts-ignore - generated at build time
import buildInfo from './build-info.json';
import { switchFeed, hasFinnhubKey } from './connect-app';


// ── Sidebar layout (three columns inside AppBody) ─────────────────────────────

const SidebarLayout = styled.div<{ $left: number; $right: number }>`
  display: grid;
  height: 100%;
  grid-template-columns: ${p => p.$left > 0 ? `${p.$left}px` : '0'} minmax(0, 1fr) ${p => p.$right > 0 ? `${p.$right}px` : '0'};
  grid-template-areas: "Left Center Right";
  gap: 4px;
  overflow: hidden;
`;

const SidePanel = styled.section<{ area: string }>`
  grid-area: ${p => p.area};
  background: cornsilk;
  color: #0b2383;
  overflow: hidden;
  display: ${p => p.area === 'Left' ? 'flex' : 'flex'};
  align-items: flex-start;
  padding: 4px;
  font-size: 0.75rem;
`;

const CenterArea = styled.section`
  grid-area: Center;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
`;


// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const { db, auth, actions } = useUsersCtx();
  const [session, , loading]  = useSession(auth, db, actions);
  const curPath               = useLocation().pathname;
  const dispatch              = useDispatch();
  const layout                = useSelector((s: any) => s.myreducer.layout);

  // Routes defined here so session is in scope for UsersView
  const ROUTES: RouteConfig[] = [
    { path: '/trades',  label: 'Trades',  roles: ['*:Trades'],  element: <TradesView />  },
    { path: '/quotes',  label: 'Quotes',  roles: ['*:Quotes'],  element: <QuotesView />  },
    { path: '/parties', label: 'Parties', roles: ['*:Parties'], element: <PartiesView /> },
    { path: '/users',   label: 'Users',   roles: [],            element: session ? <UsersView session={session} /> : null },
    { path: '/',        label: '',        roles: [],            element: <Navigate to="/trades" replace /> },
  ];

  const navRoutes = useNavRoutes(ROUTES);

  const [feedSource, setFeedSource] = useState<'mock' | 'live'>('mock');
  const toggleFeed = () => {
    const next = feedSource === 'mock' ? 'live' : 'mock';
    setFeedSource(next);
    switchFeed(next);
  };

  const toggleLeft  = () => dispatch({ type: 'ToggleLeft',  expanded: 100 });
  const toggleRight = () => dispatch({ type: 'ToggleRight', expanded: 300 });

  if (loading) return null;

  if (!session) return (
    <AppLayout>
      <Modalize $maxWidth="320px"><Login auth={auth} /></Modalize>
    </AppLayout>
  );

  return (
    <AppLayout>
      <Navbar title="ZClient" buildInfo={buildInfo} rightContent={<UserBadge />}>
        {navRoutes.map(({ route: r, accessible, missingRoles }) =>
          accessible
            ? <NavItem key={r.path} to={r.path} $active={curPath === r.path}>{r.label}</NavItem>
            : <NavItemDisabled key={r.path} title={`Requires role: ${missingRoles.join(', ')}`}>{r.label}</NavItemDisabled>
        )}
        <NavDivider />
        <NavToggle
          on={feedSource === 'live'}
          onClick={toggleFeed}
          disabled={!hasFinnhubKey}
          title={!hasFinnhubKey ? 'Set VITE_FINNHUB_KEY in .env.local to enable live data' : undefined}
        >
          Live
        </NavToggle>
        <NavDivider />
        <NavToggle on={layout.left > 0} onClick={toggleLeft}>Left</NavToggle>
        <NavToggle on={layout.right > 0} onClick={toggleRight}>Right</NavToggle>
      </Navbar>

      <AppBody>
        <SidebarLayout $left={layout.left} $right={layout.right}>
          <SidePanel area="Left">Left panel</SidePanel>
          <CenterArea>
            <GuardedRoutes routes={ROUTES} />
          </CenterArea>
          <SidePanel area="Right">Right panel</SidePanel>
        </SidebarLayout>
      </AppBody>
    </AppLayout>
  );
}
