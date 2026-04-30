// FinnhubAdapter — live market data via Finnhub WebSocket.
//
// Connects to wss://ws.finnhub.io and subscribes to a configurable symbol list.
// Finnhub's free-tier WebSocket delivers real trade ticks during US market hours
// (9:30 am – 4:00 pm ET). Outside those hours the socket stays open but silent;
// switch to MockAdapter for offline / after-hours development.
//
// Bid/ask are not available on the free tier — they are derived from the last
// trade price with a ±0.05% spread. Replace with a real quote feed if a paid
// plan is available.
//
// Required: VITE_FINNHUB_KEY in .env.local (free key from finnhub.io).

import type { FeedAdapter, FeedCallbacks, TradeRecord, QuoteRecord, PartyRecord } from './types';

// Static counterparty list — no public API provides real party data.
const PARTIES: PartyRecord[] = [
  'Goldman Sachs', 'JP Morgan', 'Citadel', 'Morgan Stanley',
  'BlackRock', 'Two Sigma', 'Renaissance', 'Bridgewater',
].map(name => ({ name }));

export interface FinnhubAdapterConfig {
  /** Finnhub API token — set VITE_FINNHUB_KEY in .env.local */
  token:   string;
  /** Symbols to subscribe to, e.g. ['AAPL', 'MSFT'] */
  symbols: string[];
}

export class FinnhubAdapter implements FeedAdapter {
  private ws:         WebSocket | null = null;
  // Tracks the last trade price per symbol so we can build a quote snapshot
  // after every incoming trade batch.
  private lastPrices: Record<string, number> = {};
  private sequence  = 1;
  private readonly token:   string;
  private readonly symbols: string[];

  constructor({ token, symbols }: FinnhubAdapterConfig) {
    this.token   = token;
    this.symbols = symbols;
  }

  connect(callbacks: FeedCallbacks) {
    callbacks.onParties(PARTIES);

    this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.token}`);

    this.ws.onopen = () => {
      // Subscribe to each symbol. Finnhub starts pushing trade events immediately.
      this.symbols.forEach(symbol =>
        this.ws!.send(JSON.stringify({ type: 'subscribe', symbol }))
      );
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      // Only process trade messages; ignore 'ping' and other control frames.
      if (msg.type !== 'trade' || !msg.data?.length) return;

      // Finnhub sends batches of ticks: { p: price, s: symbol, t: timestamp ms, v: volume }
      const trades: TradeRecord[] = msg.data.map((t: any) => {
        this.lastPrices[t.s] = t.p;
        return {
          sequence:  this.sequence++,
          timestamp: t.t,
          symbol:    t.s,
          price:     t.p,
          quantity:  t.v,
        };
      });

      callbacks.onTrades(trades);

      // Rebuild quote snapshot from latest known prices for all subscribed symbols.
      const quotes: QuoteRecord[] = Object.entries(this.lastPrices).map(([name, price]) => ({
        name,
        bid: parseFloat((price * 0.9995).toFixed(2)),
        ask: parseFloat((price * 1.0005).toFixed(2)),
      }));
      callbacks.onQuotes(quotes);
    };

    this.ws.onerror = (err) => console.error('[FinnhubAdapter] error', err);
    this.ws.onclose = ()  => console.log('[FinnhubAdapter] closed');
  }

  disconnect() {
    // Unsubscribe cleanly before closing so Finnhub releases server-side state.
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.symbols.forEach(symbol =>
        this.ws!.send(JSON.stringify({ type: 'unsubscribe', symbol }))
      );
    }
    this.ws?.close();
    this.ws = null;
  }
}
