import {Provider, TypedUseSelectorHook, useSelector as reduxUseSelector} from 'react-redux';
import React from 'react';
import {integrate} from '@therious/actions';
import {BrowserRouter} from 'react-router-dom';

import {allSlices, allMiddlewares, middlewareInits, TotalState} from '../actions/combined-slices';

export const {store, actions} = integrate(allSlices, allMiddlewares, middlewareInits);

export function connectRootComponent(WrappedComponent: React.FunctionComponent): React.FunctionComponent {
  const component = () =>
    <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <WrappedComponent/>
        </BrowserRouter>
      </Provider>
    </React.StrictMode>;
  component.displayName = `ReduxConnected(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return component;
}

export const useSelector: TypedUseSelectorHook<TotalState> = reduxUseSelector;

