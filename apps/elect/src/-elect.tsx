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
    const config = await Config.fetch('/config.yaml');
    console.warn(`config loaded`, config);
    const inflate = new Inflate(config);
    const extendedConfig = inflate.intializeSequence('bootSequence');
    console.warn(`extendedConfig `, extendedConfig);

    // Initialize elections from config
    if (config.elections) {
      actions.election.initializeElections(config.elections);
    }

    const RootComponent = connectRootComponent(App) as unknown as React.FunctionComponent;
    const root = createRoot(document.getElementById('root')!);
    root.render(<RootComponent/>);
  } catch (e) {
    console.error(e);
  }
})();

