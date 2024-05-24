import "reflect-metadata";
import React from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import GraphicApp from './GraphicApp';
import {connectRootComponent} from './actions-integration';
import {Config, Inflate} from "@therious/boot";
import {bootmeta} from '@therious/ddd';
import { logThrottle } from '@therious/utils'; // imported for side effect tests for now


import './fsm/some-tests';

const cypher = bootmeta();
console.log(cypher);


(async ()=>{
  try {
    const config = await Config.fetch('/config/-graphic.yaml');
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

// const report = logThrottle(10_000, (msg:string, ...rest:unknown[])=>console.log(msg, ...rest));
