import React,  {useCallback} from 'react';
import './App.css';

import {actions, useSelector} from './actions-integration';



function App() {
  return (
    <div className="App">
      <button onClick={() => {alert('hi')}}>Reset Game</button>
    </div>
  );
}

export default App;
