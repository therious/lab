import "reflect-metadata";

import React from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {connectRootComponent} from './actions-integration';
import {Config, Inflate} from "@therious/boot";
import './fsm/some-tests';
import "@therious/utils"


(async ()=>{
  try {
    const config = await Config.fetch('/config/example.yaml');
    console.warn(`config loaded`,config);
    const inflate = new Inflate(config);
    const extendedConfig = inflate.intializeSequence('bootSequence');
    console.warn(`extendedConfig `,extendedConfig);


    const RootComponent = connectRootComponent(App) as unknown as React.FunctionComponent;
    const root = createRoot(document.getElementById('root')!); // createRoot(container!) if you use TypeScript
    root.render(<RootComponent/>);
  } catch(e) {
    console.error(e);
  }
})();


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
