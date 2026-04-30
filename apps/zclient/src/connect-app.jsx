import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useSelector } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { applyMiddleware, bindActionCreators, combineReducers, createStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import { createSelector } from 'reselect';

import { chatSlice, usersSlice, UsersProvider } from '@therious/users';
import { firebaseAuth, db } from './firebase';

import { initialState } from './constants/initial-state';
import * as funcs from './action-funcs';
import { feedMiddleware, setAdapterFactory, switchAdapter, hasAnyFeedRole, isFeedConnected } from './feed/feed-middleware';
import { MockAdapter } from './feed/mock-adapter';
import { FinnhubAdapter } from './feed/finnhub-adapter';
import * as actionCreators from './action-creators';
import App from './App';

import './index.css';

// ── Helpers: build reducer + bound creators from a SliceConfig ────────────────
// @therious/users exports SliceConfig plain objects { name, creators, initialState, reducers },
// not RTK slices. These helpers replicate what @therious/actions integrate() does internally,
// letting us include the chat and users slices in a legacy combineReducers store.

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

// ── OMS reducer ───────────────────────────────────────────────────────────────

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
  composeWithDevTools(applyMiddleware(feedMiddleware))
);

// ── OMS action creators ───────────────────────────────────────────────────────

const omsActions = bindActionCreators(actionCreators, store.dispatch);

// ── Users / chat slice actions (passed to UsersProvider) ──────────────────────

const chatActions  = bindActionCreators(sliceCreators(chatSlice),  store.dispatch);
const usersActions = bindActionCreators(sliceCreators(usersSlice), store.dispatch);
const boundActions = { chat: chatActions, users: usersActions };

// ── Feed adapter ──────────────────────────────────────────────────────────────
// Register the default factory (MockAdapter). The feedMiddleware watches for
// chat/setMe and calls this factory once the user logs in with a feed role.
// Switching to FinnhubAdapter requires VITE_FINNHUB_KEY in .env.local.

const LIVE_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
export const hasFinnhubKey = !!import.meta.env.VITE_FINNHUB_KEY;

setAdapterFactory(() => new MockAdapter());

/**
 * Switch the active feed adapter. Called by the Live toggle in the Navbar.
 * No-ops if the current user does not hold a feed role.
 */
export function switchFeed(source) {
  const roles = store.getState().chat.me?.roles ?? [];
  if (!hasAnyFeedRole(roles)) return;

  const factory = source === 'live'
    ? () => new FinnhubAdapter({ token: import.meta.env.VITE_FINNHUB_KEY, symbols: LIVE_SYMBOLS })
    : () => new MockAdapter();
  setAdapterFactory(factory);
  // Only hot-swap if an adapter is already running (user is authorized and connected).
  if (isFeedConnected()) switchAdapter(factory(), store.dispatch);
}

// ── Selectors (exported for use in view components) ───────────────────────────

const tradesSelector  = s => s.myreducer.trades;
const partiesSelector = s => s.myreducer.parties;
const quotesSelector  = s => s.myreducer.quotes;

// Trades are capped at the last 100 to keep the grid manageable.
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
