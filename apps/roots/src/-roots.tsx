import 'reflect-metadata';
import React from 'react';
import './main.css';
import { createRoot } from 'react-dom/client';
import {Config} from "@therious/boot";
import {actions, connectRootComponent} from './actions-integration';
import {AboveApp} from './react/AboveApp';
import {deprecate, ThrowsIf, Log} from '@therious/utils';

class TestMe
{

  @Log({before:true, after:true})
  mymethod() {
    console.log("I'm a deprecated method");
  }

}



const x = new TestMe();
x.mymethod();

(async ()=>{
  try {

    const config = await Config.fetch('/config/testconfig.yaml');
    actions.local.ingestConfig(config);
    const RootComponent = connectRootComponent(AboveApp);
    const container = document.getElementById('root');
    const root = createRoot(container!); // createRoot(container!) if you use TypeScript
    // @ts-ignore
    root.render(<RootComponent/>);
  } catch(e) {
    console.error(e);
  }
})();
