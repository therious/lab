/** @typedef {import('./types').FeedAdapter} FeedAdapter */

let _adapter = null;

/**
 * Connect an adapter and wire its callbacks to Redux dispatch.
 * Call once after the store is created.
 */
export function initFeed(adapter, dispatch) {
  _adapter = adapter;
  adapter.connect({
    onTrades:  (data) => dispatch({ type: 'omsTradeListResponse',  response: { data } }),
    onQuotes:  (data) => dispatch({ type: 'omsQuoteListResponse',  response: { data } }),
    onParties: (data) => dispatch({ type: 'omsPartyListResponse',  response: { data } }),
  });
}

/**
 * Disconnect the current adapter, clear accumulated feed data, and connect a new one.
 */
export function switchAdapter(newAdapter, dispatch) {
  if (_adapter) _adapter.disconnect();
  dispatch({ type: 'feedReset' });
  initFeed(newAdapter, dispatch);
}

/**
 * Redux middleware — pass-through for most actions.
 * Forwards outbound order actions to the adapter if it implements send().
 */
export const feedMiddleware = _store => next => action => {
  if (_adapter?.send && (action.type === 'omsOrderBid' || action.type === 'omsOrderAsk')) {
    _adapter.send(action);
  }
  next(action);
};
