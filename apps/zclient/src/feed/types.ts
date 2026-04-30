export interface TradeRecord {
  sequence: number;
  timestamp: number;  // ms since epoch
  symbol:    string;
  price:     number;
  quantity:  number;
}

export interface QuoteRecord {
  name: string;  // symbol
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
