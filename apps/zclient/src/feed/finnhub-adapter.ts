import type { FeedAdapter, FeedCallbacks, TradeRecord, QuoteRecord, PartyRecord } from './types';

const PARTIES: PartyRecord[] = [
  'Goldman Sachs', 'JP Morgan', 'Citadel', 'Morgan Stanley',
  'BlackRock', 'Two Sigma', 'Renaissance', 'Bridgewater',
].map(name => ({ name }));

export interface FinnhubAdapterConfig {
  /** Finnhub API token — set VITE_FINNHUB_KEY in .env.local */
  token:   string;
  /** Symbols to subscribe to */
  symbols: string[];
}

export class FinnhubAdapter implements FeedAdapter {
  private ws:         WebSocket | null = null;
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
      this.symbols.forEach(symbol =>
        this.ws!.send(JSON.stringify({ type: 'subscribe', symbol }))
      );
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== 'trade' || !msg.data?.length) return;

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
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.symbols.forEach(symbol =>
        this.ws!.send(JSON.stringify({ type: 'unsubscribe', symbol }))
      );
    }
    this.ws?.close();
    this.ws = null;
  }
}
