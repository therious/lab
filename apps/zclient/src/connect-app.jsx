import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useSelector } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { applyMiddleware, bindActionCreators, combineReducers, createStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { createSelector } from 'reselect';

import { chatSlice, usersSlice, UsersProvider } from '@therious/users';
import { firebaseAuth, db } from './firebase';

// ── Helpers: build reducer + bound creators from a SliceConfig ────────────────
// (mirrors what @therious/actions integrate() does internally)

function sliceReducer({ name, initialState, reducers }) {
  const typeMap = {};
  Object.entries(reducers).forEach(([k, v]) => { typeMap[`${name}/${k}`] = v; });
  return (state = initialState, action) => {
    const fn = typeMap[action.type];
    return fn ? fn(state, action) : state;
  };
}

function sliceCreators({ name, creators }) {
  const result = {};
  Object.entries(creators).forEach(([k, v]) => {
    result[k] = typeof v === 'function'
      ? (...args) => ({ type: `${name}/${k}`, ...v(...args) })
      : ()        => ({ type: `${name}/${k}`, ...v });
  });
  return result;
}

import { initialState } from './constants/initial-state';
import * as funcs from './action-funcs';
import { getMiddleware, init } from './example-redux-middleware';
import * as actionCreators from './action-creators';
import App from './App';

import './index.css';

// ── OMS reducer (unchanged) ───────────────────────────────────────────────────

const actionstyle = `
    padding: 2px 8px;
    border: 1px solid black;
    background-color:plum;
    color: black;
    `;

function myreducer(state = initialState, action) {
  console.log(`%c +action - ${action.type}`, actionstyle, action);
  const actionf = funcs[action.type];
  return actionf ? actionf(state, action) : state;
}

// ── Root reducer — OMS data + auth/users slices ───────────────────────────────

const rootReducer = combineReducers({
  myreducer,
  chat:  sliceReducer(chatSlice),
  users: sliceReducer(usersSlice),
});

// ── Store ─────────────────────────────────────────────────────────────────────

const store = createStore(
  rootReducer,
  composeWithDevTools(applyMiddleware(getMiddleware))
);

// Bind OMS action creators and wire them into the API middleware
const omsActions = bindActionCreators(actionCreators, store.dispatch);
init(omsActions);

// Bind users/chat slice actions for UsersProvider
const chatActions  = bindActionCreators(sliceCreators(chatSlice),  store.dispatch);
const usersActions = bindActionCreators(sliceCreators(usersSlice), store.dispatch);
const boundActions = { chat: chatActions, users: usersActions };

// ── Selectors (exported for use in view components) ───────────────────────────

const tradesSelector  = s => s.myreducer.trades;
const partiesSelector = s => s.myreducer.parties;
const quotesSelector  = s => s.myreducer.quotes;

export const aTradesSelector  = createSelector(tradesSelector,  o => Object.values(o).slice(-100));
export const aQuotesSelector  = createSelector(quotesSelector,  o => Object.values(o));
export const aPartiesSelector = createSelector(partiesSelector, o => Object.values(o));

// ── OMS actions (exported for use in view components) ─────────────────────────

export { omsActions };

// ── App mount ─────────────────────────────────────────────────────────────────

export function connectApp() {
  const root = createRoot(document.getElementById('root'));
  root.render(
    <Provider store={store}>
      <BrowserRouter>
        <UsersProvider
          db={db}
          auth={firebaseAuth}
          actions={boundActions}
          useSelector={useSelector}
          appName="zclient"
        >
          <App />
        </UsersProvider>
      </BrowserRouter>
    </Provider>
  );
}
