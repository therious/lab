import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { connectRootComponent } from './actions-integration';
import { badgeFavicon, envBadgeColor } from '@therious/utils';
badgeFavicon(envBadgeColor());

const RootComponent = connectRootComponent(App) as unknown as React.FunctionComponent;
createRoot(document.getElementById('root')!).render(<RootComponent />);
