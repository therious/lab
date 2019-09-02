import React from 'react';
import styled from 'styled-components';
import logo from './logo.svg';

import {guaranteedString} from "./utils/sample-utils";

const a = 'real string';
const b = undefined;

const AppDiv = styled.div`
    text-align: center;
`;

const AppImg = styled.img`
  @keyframes App-logo-spin {
    from { transform: rotate(0deg)   }
    to   { transform: rotate(360deg) }
 }

 animation: App-logo-spin infinite 20s linear;
 height: 40vmin;
 pointer-events: none;
`;

const AppHeader = styled.header`
    background-color: #282c34;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: calc(10px + 2vmin);
    color: white;
`;

const AppLink = styled.a`
 color: #61dafb;
`;



function App() {
  return (
    <AppDiv >
      <AppHeader>
        <AppImg src={logo} alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <AppLink
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </AppLink>
        <br/> {guaranteedString(a)} <br/>{guaranteedString(b)}
      </AppHeader>

    </AppDiv>
  );
}

export default App;
