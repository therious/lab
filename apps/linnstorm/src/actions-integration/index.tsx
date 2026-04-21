import { Provider, TypedUseSelectorHook, useSelector as reduxUseSelector } from 'react-redux';
import React from 'react';
import { integrate } from '@therious/actions';

import { allSlices, allMiddlewares, middlewareInits, TotalState } from '../actions/combined-slices';

export const { store, actions } = integrate(allSlices, allMiddlewares, middlewareInits);

export function connectRootComponent(WrappedComponent: React.ComponentType): React.ComponentType {
  const component = () => <Provider store={store}><WrappedComponent /></Provider>;
  component.displayName = `ReduxConnected(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return component;
}

export const useSelector: TypedUseSelectorHook<TotalState> = reduxUseSelector;
