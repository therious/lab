import React, {useCallback, useEffect} from 'react';
import { Route, Routes, useLocation } from "react-router-dom";
import { User } from 'firebase/auth';

import styled from 'styled-components';

import {actions, useSelector} from '../actions-integration';
import {JSONTree} from 'react-json-tree';

import {SnackbarProvider} from "notistack";

import {
  UsersProvider, useSession, Login,
  UsersView, AdminView, RoleGuard, UserBadge,
} from '@therious/users';
import { RouteGuard } from './RouteGuard';
import { Modalize, Navbar, NavItem, NavDivider } from '@therious/components';
import { firebaseAuth, db } from '../firebase';

// @ts-ignore - generated at build time by generate-build-info.js
import buildInfo from '../build-info.json';

import {NotifyWrapper} from "./NotifyWrapper";
import {Modal} from "./Modal";
import {SliceView} from "./SliceView";
import {RtParameter} from "./RtParameters";
import RtTuning from "./RtTuning";
import {RtMidiview} from "./RtMidiview";
import {RtFiles} from "./RtFiles.jsx";
import {midiSetup} from "../linnutils/mymidi";

const Layout = styled.div<{left:number, right:number}>`
    display:grid;
    height: calc(100vh);
    width: calc(100vw);

    row-gap:4px;
    column-gap:4px;

    grid-template-columns: ${props=>props.left}px minmax(0, 1fr) ${props=>props.right}px;
    grid-template-rows: 44px minmax(0, 1fr);
    grid-template-areas: "LNavbar Navbar Navbar"
                         "Left CenterBody Right";
`;

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
const Right = styled.section`
    grid-area: Right;
    background-color: cornsilk;
    color: #0b2383;
`;

const TopButton = styled.button`
  padding: 0 5px;
  margin: 0 5px;
`;

const AllSlices = () => <div>{Object.keys(actions).map((slice)=><SliceView key={slice} slice={slice}/>)}</div>;

let messageCtr = 0;

const NewTabLink = ({href, children}:{href:string, children:React.ReactNode}) =>
  <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

const Intro = () => {
  const { local } = useSelector(s=>s);
  const should = useCallback(()=>true,[]);
  return (
  <section>
    <h1>Configuration Info</h1>
    <div style={{width:'fit-content'}}>
      <JSONTree data={local.config}
                hideRoot={true} sortObjectKeys={false}
                shouldExpandNodeInitially={should} />
                <h1>Other Links</h1>
                <ul>
                 <li><NewTabLink href="https://www.rogerlinndesign.com/linnstrument">Roger Linn Design</NewTabLink></li>
                  <li><NewTabLink href="https://www.rogerlinndesign.com/support/linnstrument-support-panel-settings">Manual</NewTabLink></li>
                </ul>
    </div>
  </section>);
};

midiSetup(actions.midi);

const AuthenticatedApp = ({ session }: { session: User }) => {
  const location = useLocation();

  useEffect(()=> {
    window.document.body.addEventListener('contextmenu', (e)=>{e.preventDefault()});
    window.onstorage = evt => {
      if(evt === undefined) return;
      actions.patch.mirrorOtherInstance(evt.key, evt.oldValue, evt.newValue);
    };
  }, []);

  const {
    local:    {layout:   {left,right}},
    notify:   {notices:[notice=undefined]},
  } = useSelector(s=>s);

  const {warn, error, fatal, dismiss} = actions.notify;
  const {toggleLeft, toggleRight} = actions.local;
  const curPath = location.pathname;

  return (
    <Layout left={left} right={right}>
      <Navbar title="Linnstorm" buildInfo={buildInfo} branding rightContent={<UserBadge />}>
        <NavItem to="/params" $active={curPath === '/params' || curPath === '/'}>Parameters</NavItem>
        <NavItem to="/tuning" $active={curPath === '/tuning'}>Tuning</NavItem>
        <NavItem to="/midi"   $active={curPath === '/midi'}>Midi View</NavItem>
        <NavItem to="/users"  $active={curPath === '/users'}>Users</NavItem>
        <RoleGuard roles={['admin']}>
          <NavDivider />
          <NavItem to="/admin" $active={curPath === '/admin'}>Admin</NavItem>
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
        {notice && notice.level === 'fatal' ?
          <Modal content={notice.msg} noClose/>
          : (notice && (notice.remedy as string) === 'Modal') ?
          <Modal content={<div><h1>{notice.level}</h1><hr/>{notice.msg}</div>} close={()=>{dismiss(notice.key)}}/>
          :
          <Routes>
            <Route path="/"       element={<RouteGuard><RtParameter/></RouteGuard>}/>
            <Route path="/intro"  element={<RouteGuard><Intro/></RouteGuard>}/>
            <Route path="/params" element={<RouteGuard><RtParameter/></RouteGuard>}/>
            <Route path="/tuning" element={<RouteGuard><RtTuning/></RouteGuard>}/>
            <Route path="/midi"   element={<RouteGuard><RtMidiview/></RouteGuard>}/>
            <Route path="/files"  element={<RouteGuard><RtFiles/></RouteGuard>}/>
            <Route path="/users"  element={<RouteGuard><UsersView session={session} /></RouteGuard>}/>
            <Route path="/admin"  element={<RouteGuard roles={['admin']}><AdminView /></RouteGuard>}/>
          </Routes>
        }
      </CenterBody>

      <Right><AllSlices/></Right>
    </Layout>
  );
};

export default function App() {
  const [session, , loading] = useSession(firebaseAuth, db, actions);

  return (
    <SnackbarProvider maxSnack={5} hideIconVariant
                      anchorOrigin={{vertical: 'top', horizontal: 'right'}}>
      <NotifyWrapper />
      {loading
        ? null
        : !session
        ? <Modalize $maxWidth="320px"><Login auth={firebaseAuth} /></Modalize>
        : <UsersProvider db={db} auth={firebaseAuth} actions={actions} useSelector={useSelector} appName="linnstorm">
            <AuthenticatedApp session={session} />
          </UsersProvider>
      }
    </SnackbarProvider>
  );
}
