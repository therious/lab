import React from 'react';
import logo from './logo.svg';
import './App.css';
import {guaranteedString} from "./utils/sample-utils";

const a = 'real string';
const b = undefined;

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <br/> {guaranteedString(a)} <br/>{guaranteedString(b)}
      </header>

    </div>
  );
}

export default App;
