import type { FeedAdapter, FeedCallbacks, TradeRecord, QuoteRecord, PartyRecord } from './types';

const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

const BASE_PRICES: Record<string, number> = {
  AAPL: 175, MSFT: 380, GOOGL: 140, AMZN: 185, TSLA: 250,
};

const PARTIES: PartyRecord[] = [
  'Goldman Sachs', 'JP Morgan', 'Citadel', 'Morgan Stanley',
  'BlackRock', 'Two Sigma', 'Renaissance', 'Bridgewater',
].map(name => ({ name }));

export interface MockAdapterConfig {
  intervalMs?: number;
}

export class MockAdapter implements FeedAdapter {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private prices    = { ...BASE_PRICES };
  private sequence  = 1;
  private readonly intervalMs: number;

  constructor({ intervalMs = 1500 }: MockAdapterConfig = {}) {
    this.intervalMs = intervalMs;
  }

  connect(callbacks: FeedCallbacks) {
    callbacks.onParties(PARTIES);

    this.intervalId = setInterval(() => {
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const move   = (Math.random() - 0.495) * 0.5;   // slight upward drift
      this.prices[symbol] = Math.max(1, this.prices[symbol] + move);
      const price = parseFloat(this.prices[symbol].toFixed(2));

      const trade: TradeRecord = {
        sequence:  this.sequence++,
        timestamp: Date.now(),
        symbol,
        price,
        quantity:  Math.floor(Math.random() * 500) + 1,
      };

      callbacks.onTrades([trade]);

      const quotes: QuoteRecord[] = SYMBOLS.map(s => ({
        name: s,
        bid:  parseFloat((this.prices[s] * 0.9995).toFixed(2)),
        ask:  parseFloat((this.prices[s] * 1.0005).toFixed(2)),
      }));
      callbacks.onQuotes(quotes);
    }, this.intervalMs);
  }

  disconnect() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
