// ── Feed adapter contract ─────────────────────────────────────────────────────
//
// All data sources (mock, Finnhub, future OMS WebSocket) implement FeedAdapter.
// The middleware calls connect() once the user is authenticated and holds at
// least one feed role (Trades / Quotes / Parties). It calls disconnect() on
// logout or adapter switch.
//
// Data flows one way: adapter → callbacks → Redux dispatch → reducers → views.
// Outbound actions (order placement) use the optional send() method.

export interface TradeRecord {
  sequence: number;
  timestamp: number;  // ms since epoch
  symbol:    string;
  price:     number;
  quantity:  number;
}

export interface QuoteRecord {
  name: string;  // symbol, matches the key field used by stateProducer
  bid:  number;
  ask:  number;
}

export interface PartyRecord {
  name: string;
}

export interface FeedCallbacks {
  onTrades  (trades:  TradeRecord[]): void;
  onQuotes  (quotes:  QuoteRecord[]): void;
  onParties (parties: PartyRecord[]): void;
}

export interface FeedAdapter {
  connect    (callbacks: FeedCallbacks): void;
  disconnect (): void;
  /** Optional — forward outbound order actions to the feed source */
  send?      (action: object): void;
}
