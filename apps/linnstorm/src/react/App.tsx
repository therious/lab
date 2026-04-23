import React, {useCallback, useEffect} from 'react';
import { Route, Routes, NavLink, useLocation } from "react-router-dom";
import { User } from 'firebase/auth';

import styled from 'styled-components';

import {actions, useSelector} from '../actions-integration';
import {JSONTree} from 'react-json-tree';

import {SnackbarProvider} from "notistack";

import {
  UsersProvider, useSession, Login,
  UsersView, AdminView, RoleGuard,
} from '@therious/users';
import { RouteGuard } from './RouteGuard';
import { Modalize } from '@therious/components';
import { firebaseAuth, db } from '../firebase';

import {NotifyWrapper} from "./NotifyWrapper";
import {Modal} from "./Modal";
import {SliceView} from "./SliceView";
import {RtParameter} from "./RtParameters";
import RtTuning from "./RtTuning";
import {RtMidiview} from "./RtMidiview";
import {RtFiles} from "./RtFiles.jsx";
import {midiSetup} from "../linnutils/mymidi";

const palette = {
      plum: '#4b54a1',
      black: '#0c0e0d',
      blueslate: '#465f73',
      slate: '#5f5f7b',
      drab: '#b1c3a9',
      sky: '#5e86ba',
      moon: '#b3961e',
      midnight: '#0b2383',

      gold: 'gold',
      cornsilk: 'cornsilk',
      blue: 'blue',
      forest: 'forestgreen',
      crimson: 'crimson'
};

const Layout = styled.div<{left:number, right:number}>`
    display:grid;
    height: calc(100vh);
    width: calc(100vw);

    row-gap:4px;
    column-gap:4px;

    grid-template-columns: ${props=>props.left}px minmax(0, 1fr) ${props=>props.right}px;
    grid-template-rows: 30px minmax(0, 1fr);
    grid-template-areas: "LNavbar Navbar Navbar"
                         "Left CenterBody Right";
`;

const Navbar = styled.section`
    grid-area: Navbar;
    padding-top: 5px;
    background-color: ${palette.midnight};
    color: ${palette.drab};
    height:fit-content;
    overflow: auto;
`;

const CenterBody = styled.section`
    display: block;
    height:100%;
    grid-area: CenterBody;
    background-color: ${palette.drab};
    color: ${palette.black};
`;
const Left = styled.section`
    grid-area: Left;
    background-color: ${palette.cornsilk};
    color: ${palette.midnight};
`;
const Right = styled.section`
    grid-area: Right;
    background-color: ${palette.cornsilk};
    color: ${palette.midnight};
`;

const topCssAttributes = `
  padding-right:          5px;
  padding-left:          5px;
  margin-left: 5px;
  margin-right: 5px;
`;

const TopButton = styled.button`${topCssAttributes}`;

const StyledLink = styled(NavLink)<{$active: boolean}>`
  display: inline-block;
  background: ${(props:any) => props?.$active? '#0f0': 'antiquewhite'};
  min-width: 100px;
  border: 1px solid white;
  margin: 0;
  padding: 5px;

  &:active {
    color: red;
  }

  &:hover {
    background: palegreen;
  }

  border-radius: 3px;

  & > * {
    color: orange;
    text-decoration: none;
  }
`;

const MyNavLink = ({to, children, curPath}:{to:string, children:React.ReactNode, curPath:string}) =>
  <StyledLink $active={curPath === to} to={to}>{children}</StyledLink>;

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
      <Navbar>
        <div style={{ margin: 'auto', width: '50%', display: 'inline-block'}}>
          <MyNavLink curPath={curPath} to="/params">Parameters</MyNavLink>
          <MyNavLink curPath={curPath} to="/tuning">Tuning</MyNavLink>
          <MyNavLink curPath={curPath} to="/midi">Midi View</MyNavLink>
          <MyNavLink curPath={curPath} to="/users">Users</MyNavLink>
          <RoleGuard roles={['admin']}>
            <MyNavLink curPath={curPath} to="/admin">Admin</MyNavLink>
          </RoleGuard>
        </div>
        <div style={{float:'right', display: 'inline-block', marginRight:'20px'}}>
          <a style={{color:'white', textDecoration:'none', font: 'Roboto'}}
             href="https://www.netlify.com">
            <span style={{verticalAlign: 'top', fontStyle: 'italic'}}>deployed via</span>{' '}
            <img height="20px" src="/netlify/full-logo-dark.svg" alt="Netlify"/>
          </a>
        </div>
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
