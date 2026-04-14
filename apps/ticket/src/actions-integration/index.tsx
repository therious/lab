import {Provider, TypedUseSelectorHook, useSelector as reduxUseSelector} from "react-redux";
import React from "react";
import {integrate} from '@therious/actions';
import {BrowserRouter} from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import {allSlices, allMiddlewares, middlewareInits, TotalState} from "../actions/combined-slices";
import { initChatMiddleware, appKey } from '@therious/users';
import { db } from "../firebase";

export const {store, actions} = integrate(allSlices, allMiddlewares, middlewareInits);

initChatMiddleware((uid: string) =>
  setDoc(doc(db, 'apps', appKey(), 'users', uid), { lastSeen: serverTimestamp() }, { merge: true })
);

export function connectRootComponent(WrappedComponent: React.FunctionComponent):React.FunctionComponent {
  // @ts-ignore
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
