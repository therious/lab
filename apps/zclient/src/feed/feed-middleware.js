/** @typedef {import('./types').FeedAdapter} FeedAdapter */

// Role names (unqualified) that entitle a user to a feed connection.
// Any one of these is sufficient.
const FEED_ROLE_NAMES = ['Trades', 'Quotes', 'Parties'];

export function hasAnyFeedRole(roles = []) {
  return FEED_ROLE_NAMES.some(name =>
    roles.includes(`*:${name}`) || roles.some(r => r.split(':')[1] === name)
  );
}

let _adapter        = null;
let _adapterFactory = null;   // () => FeedAdapter — set by connect-app before store creation

/** Register the factory used to create adapters on demand. */
export function setAdapterFactory(factory) {
  _adapterFactory = factory;
}

/** Wire an adapter's callbacks to Redux dispatch. */
export function initFeed(adapter, dispatch) {
  _adapter = adapter;
  adapter.connect({
    onTrades:  (data) => dispatch({ type: 'omsTradeListResponse',  response: { data } }),
    onQuotes:  (data) => dispatch({ type: 'omsQuoteListResponse',  response: { data } }),
    onParties: (data) => dispatch({ type: 'omsPartyListResponse',  response: { data } }),
  });
}

/** Disconnect the current adapter, clear feed data, connect a new one. */
export function switchAdapter(newAdapter, dispatch) {
  if (_adapter) _adapter.disconnect();
  dispatch({ type: 'feedReset' });
  initFeed(newAdapter, dispatch);
}

/** Returns true if an adapter is currently connected. */
export function isFeedConnected() {
  return _adapter !== null;
}

export const feedMiddleware = store => next => action => {
  // Forward outbound order actions to the adapter if it supports them.
  if (_adapter?.send && (action.type === 'omsOrderBid' || action.type === 'omsOrderAsk')) {
    _adapter.send(action);
  }

  next(action);

  // Connect on login when the user holds at least one feed role.
  // Disconnect on logout.
  if (action.type === 'chat/setMe') {
    const { user } = action;
    if (user && hasAnyFeedRole(user.roles)) {
      if (!_adapter && _adapterFactory) {
        initFeed(_adapterFactory(), store.dispatch);
      }
    } else if (!user && _adapter) {
      _adapter.disconnect();
      store.dispatch({ type: 'feedReset' });
      _adapter = null;
    }
  }
};
