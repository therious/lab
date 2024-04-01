import React from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import GraphicApp from './GraphicApp';
import {connectRootComponent} from './actions-integration';
import "reflect-metadata";
import {Config, Inflate} from "@therious/boot";
import './fsm/some-tests';

(async ()=>{
  try {
    const config = await Config.fetch('/config/example.yaml');
    console.warn(`config loaded`,config);
    const inflate = new Inflate(config);
    const extendedConfig = inflate.intializeSequence('bootSequence');
    console.warn(`extendedConfig `,extendedConfig);


    const RootComponent = connectRootComponent(GraphicApp) as unknown as React.FunctionComponent;
    const root = createRoot(document.getElementById('root')!); // createRoot(container!) if you use TypeScript
    root.render(<RootComponent/>);
  } catch(e) {
    console.error(e);
  }
})();
