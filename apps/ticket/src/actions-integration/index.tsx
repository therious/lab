
import {Provider, TypedUseSelectorHook, useSelector as reduxUseSelector} from "react-redux";
import React from "react";
import {integrate} from '@therious/actions';

import {allSlices, allMiddlewares, middlewareInits, TotalState} from "../actions/combined-slices";

export const {store, actions} = integrate(allSlices, allMiddlewares, middlewareInits)

export function connectRootComponent(WrappedComponent: React.FunctionComponent):React.FunctionComponent {
  // Creating the inner component. The calculated Props type here is the where the magic happens.
  // @ts-ignore
  const component = () => <Provider store={store}><WrappedComponent/></Provider>;
  component.displayName = `ReduxConnected(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return component;
}

// if we don't create our own alias to useSelector, then every component that uses it relies directly on redux
// whereas this could be satisfied with other state management libraries
// still having issues here https://stackoverflow.com/questions/57472105/react-redux-useselector-typescript-type-for-state
export const useSelector: TypedUseSelectorHook<TotalState> = reduxUseSelector;
