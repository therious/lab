import React, {useEffect} from 'react';
import { Route, Routes, useLocation } from "react-router-dom"

import styled from 'styled-components';

import {actions, useSelector} from '../actions-integration';
import { UsersProvider, useSession, Login, UsersView, AdminView, RoleGuard, UserBadge } from '@therious/users';
import { Modalize, Navbar, NavItem, NavDivider } from '@therious/components';
import { firebaseAuth, db } from '../firebase';

import {SnackbarProvider} from "notistack";

import {NotifyWrapper} from "./NotifyWrapper";
import {Modal} from "./Modal";
import {RtGridView} from "./RtGridView.jsx";
import {RtStarView} from "./RtStarView";
import {PersistentGraphContainer} from "./PersistentGraphContainer";

// @ts-ignore - generated at build time by generate-build-info.js
import buildInfo from '../build-info.json';

// ── Layout ────────────────────────────────────────────────────────────────────

const Layout = styled.div`
    display:grid;
    height: calc(100vh);
    width: calc(100vw);
    row-gap:4px;
    column-gap:4px;
    grid-template-columns: ${props=>props.left}px minmax(0, 1fr);
    grid-template-rows: 44px minmax(0, 1fr);
    grid-template-areas: "LNavbar Navbar"
                         "Left CenterBody";
`;

Layout.defaultProps = {left:0, right:0};

const CenterBody = styled.section`
    display: block;
    height:100%;
    grid-area: CenterBody;
    background-color: #b1c3a9;
    color: #0c0e0d;
`;

const Left = styled.section`
    grid-area: Left;
    background-color: cornsilk;
    color: #0b2383;
`;

const TopButton = styled.button`
  padding: 0 5px;
  margin: 0 5px;
`;

// ── App ───────────────────────────────────────────────────────────────────────

let messageCtr = 0;

const App = () => {
  const location = useLocation();
  const [session, , loading] = useSession(firebaseAuth, db, actions);

  useEffect(()=> {
    window.document.body.addEventListener('contextmenu', (e)=>{e.preventDefault()});
    window.onstorage = evt => {
      if(evt === undefined) return;
      actions.patch.mirrorOtherInstance(evt.key, evt.oldValue, evt.newValue);
    };
  }, []);

  const {
    local:    {layout: {left, right}},
    notify:   {notices:[notice=undefined]},
  } = useSelector(s=>s);

  const {warn, error, fatal, dismiss} = actions.notify;
  const {toggleLeft, toggleRight} = actions.local;

  if (loading) return null;

  if (!session) {
    return (
      <SnackbarProvider maxSnack={5} hideIconVariant anchorOrigin={{vertical: "top", horizontal: "right"}}>
        <NotifyWrapper />
        <Modalize $maxWidth="320px"><Login auth={firebaseAuth} /></Modalize>
      </SnackbarProvider>
    );
  }

  return (
    <SnackbarProvider maxSnack={5} hideIconVariant anchorOrigin={{vertical: "top", horizontal: "right"}}>
      <NotifyWrapper />
      <UsersProvider db={db} auth={firebaseAuth} actions={actions} useSelector={useSelector} appName="roots">
        <Layout left={left} right={right}>

          <Navbar title="Roots" buildInfo={buildInfo} branding rightContent={<UserBadge />} style={{ gridArea: 'Navbar' }}>
            <NavItem to="/grid" $active={location.pathname === '/grid' || location.pathname === '/'}>Grid View</NavItem>
            <NavItem to="/star" $active={location.pathname === '/star'}>Visualization</NavItem>
            <NavItem to="/users" $active={location.pathname === '/users'}>Users</NavItem>
            <RoleGuard roles={['admin']}>
              <NavDivider />
              <NavItem to="/admin" $active={location.pathname === '/admin'}>Admin</NavItem>
            </RoleGuard>
          </Navbar>

          <Left>
            <TopButton onClick={()=>{toggleLeft(100)}}>Left</TopButton>
            <TopButton onClick={()=>fatal({msg:`${messageCtr++}: I am fatal`})}>Fatal Message</TopButton>
            <TopButton onClick={()=>error({msg:`${messageCtr++}: Seen one error`, remedy:'Acknowledge'})}>Error Message</TopButton>
            <TopButton onClick={()=>warn({msg:`${messageCtr++}: This is a warning with Modal as a remedy`, remedy:'Modal'})}>Modal Warning</TopButton>
            <TopButton onClick={()=>warn({msg:`${messageCtr++}: This is a warning with Acknowledge as a remedy`, remedy:'Acknowledge'})}>Warning</TopButton>
            <TopButton onClick={()=>{toggleRight(900)}}>Toggle Slice View</TopButton>
          </Left>

          <CenterBody>
            <PersistentGraphContainer />
            {notice && notice.level === 'fatal'
              ? <Modal content={notice.msg} noClose/>
              : (notice && notice.remedy === 'Modal')
                ? <Modal content={<div><h1>{notice.level}</h1><hr/>{notice.msg}</div>} close={()=>{dismiss(notice.key)}}/>
                : <Routes>
                    <Route path="/"      element={<RtGridView/>}/>
                    <Route path="/grid"  element={<RtGridView/>}/>
                    <Route path="/star"  element={<RtStarView/>}/>
                    <Route path="/users" element={<UsersView session={session} />}/>
                    <Route path="/admin" element={<RoleGuard roles={['admin']}><AdminView /></RoleGuard>}/>
                  </Routes>
            }
          </CenterBody>

        </Layout>
      </UsersProvider>
    </SnackbarProvider>
  );
};

export default App;
