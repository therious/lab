import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Game } from './Game';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa }  from '@supabase/auth-ui-shared';
import {Modalize} from '@therious/components';
import {useSession, providers, signout} from './auth';
import {Countries} from './Countries';

import { useLocation, Route,Routes, useNavigate } from 'react-router-dom';
import {Layout, CenterBody, MyNavLink, Navbar} from './Navbar';

const supabaseUrl = 'https://lkeoolxvzgdecjewboiz.supabase.co';
const supabaseApiKey = import.meta.env.VITE_SUPA_LAB_API_KEY;

const supabase = createClient(supabaseUrl, supabaseApiKey);


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
  const cb = useCallback(async ()=>{await signout(); navigate('/')},[]);

  return (
  <Modalize $maxWidth={"350px"}>
  <h1>Signout?</h1>
  <hr/>
    <button onClick={cb}>Signout</button>
  </Modalize>);
}

type SessionRec    = unknown;

export default function App() {
  const [session, _] = useSession();
  const curPath = useLocation().pathname;

  return session?
  <Layout>
    <Navbar>
      <MyNavLink curPath={curPath} to="/"         >Game     </MyNavLink>
      <MyNavLink curPath={curPath} to="/countries">Countries</MyNavLink>
      <MyNavLink curPath={curPath} to="/profile"  >Profile  </MyNavLink>
      <MyNavLink curPath={curPath} to="/signout"  >Signout  </MyNavLink>
    </Navbar>
    <CenterBody>
      <Routes>
        <Route path="/"          element={<Game/>     }/>
        <Route path="/countries" element={<Countries/>}/>
        <Route path="/profile"   element={<Profile/>  }/>
        <Route path="/signout"   element={<Signout/>  }/>
      </Routes>
    </CenterBody>
  </Layout>
  :
  <Modalize $maxWidth={"350px"}>
    <Auth providers={providers} supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
  </Modalize>
  ;
}
