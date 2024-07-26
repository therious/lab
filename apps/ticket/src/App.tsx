import {useCallback} from 'react';
import {useLocation, Route,Routes, useNavigate } from 'react-router-dom';
import {SnackbarProvider} from 'notistack';

import {Modalize} from '@therious/components';
import {useSelector} from './actions-integration';
import {useSession, signout} from './auth';
import {Countries} from './react/Countries';
import {Game} from './react/Game';

import {Layout, CenterBody, MyNavLink, Navbar} from './react/Navbar';
import {Login} from './react/Login';
import {NotifyWrapper} from "./react/NotifyWrapper";
import {TotalState} from './actions/combined-slices';
import {RtStorage} from './RtStorage';

// const PrivateRoute = ({ user, children, redirect }) => {
//   const authenticate = localStorage.getItem('jwtToken') ? true : false;
//   const location = useLocation();
//   return authenticate ? (
//     children
//   ) : (
//     <Navigate
//       to={`/auth/login?redirect=${encodeURIComponent(redirect || location.pathname)}`}
//     />
//   );
// };

const Profile = () => {
 return <>profile here</>
};

const Signout = () => {
  const navigate = useNavigate();
  const cb = useCallback(async ()=>{await signout(); navigate('/')},[navigate]);

  return (
  <Modalize $maxWidth={"350px"}>
  <h1>Signout?</h1>
  <hr/>
    <button onClick={cb}>Signout</button>
  </Modalize>);
}

export default function App() {
  const {
    notify: { notices },
  } = useSelector<TotalState>(s => s);

  const [session, _] = useSession();
  const curPath = useLocation().pathname;

  return (
    <SnackbarProvider maxSnack={5} hideIconVariant anchorOrigin={{ vertical: "top", horizontal: "right", }}>
      <NotifyWrapper />
      {
        !session?
        <Modalize $maxWidth={"320px"}><Login/></Modalize>:
        <Layout>
          <Navbar>
            <MyNavLink curPath={curPath} to="/">Game </MyNavLink>
            <MyNavLink curPath={curPath} to="/patches">Patches </MyNavLink>
            <MyNavLink curPath={curPath} to="/countries">Countries</MyNavLink>
            <MyNavLink curPath={curPath} to="/profile">Profile </MyNavLink>
            <MyNavLink curPath={curPath} to="/signout">Signout </MyNavLink>
          </Navbar>
          <CenterBody>
            <Routes>
              <Route path="/" element={<Game/>}/>
              <Route path="/patches" element={<RtStorage/>}/>
              <Route path="/countries" element={<Countries/>}/>
              <Route path="/profile" element={<Profile/>}/>
              <Route path="/signout" element={<Signout/>}/>
            </Routes>
          </CenterBody>
        </Layout>
      }
    </SnackbarProvider>
  );
}
