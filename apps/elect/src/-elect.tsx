import 'reflect-metadata';

import React from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App';
import {connectRootComponent, actions} from './actions-integration';
import {Config, Inflate} from '@therious/boot';
import '@therious/utils';

(async () => {
  try {
    // Elections are now loaded from API via the LandingPage component
    // No need to load from config.yaml anymore
    
    const RootComponent = connectRootComponent(App) as unknown as React.FunctionComponent;
    const root = createRoot(document.getElementById('root')!);
    root.render(<RootComponent/>);
  } catch (e) {
    console.error(e);
  }
})();

