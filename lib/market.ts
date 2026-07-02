/**
 * Market simulation engine.
 *
 * A single module-level engine drives every market surface in the app —
 * hero terminal, ticker tape, analytics, and the network console — so all
 * of them observe the same tape. Prices follow a mean-reverting random walk
 * seeded per-market; the engine ticks on a fixed interval and notifies
 * subscribers through useSyncExternalStore.
 */

import { gaussian, hashSeed, mulberry32 } from "./prng";

export const HISTORY = 96;
export const TICK_MS = 1400;

export interface DepthLevel {
  price: number;
  size: number;
  total: number;
}

export interface Market {
  symbol: string;
  name: string;
  kind: "perp" | "index";
  price: number;
  basePrice: number;
  change24h: number;
  funding: number;
  volume24h: number;
  openInterest: number;
  liquidations24h: number;
  history: number[];
  /** last tick direction: 1 up, -1 down, 0 flat */
  dir: number;
  decimals: number;
}

export interface MarketBook {
  bids: DepthLevel[];
  asks: DepthLevel[];
  mid: number;
}

interface MarketSeed {
  symbol: string;
  name: string;
  kind: "perp" | "index";
  base: number;
  vol: number;
  volume: number;
  oi: number;
  liq: number;
  decimals: number;
}

const SEEDS: MarketSeed[] = [
  { symbol: "H100-PERP", name: "NVIDIA H100 SXM / hr", kind: "perp", base: 2.487, vol: 0.0035, volume: 141_200_000, oi: 63_400_000, liq: 1_910_000, decimals: 3 },
  { symbol: "B200-PERP", name: "NVIDIA B200 / hr", kind: "perp", base: 4.912, vol: 0.0052, volume: 96_800_000, oi: 88_100_000, liq: 4_270_000, decimals: 3 },
  { symbol: "A100-PERP", name: "NVIDIA A100 80G / hr", kind: "perp", base: 1.294, vol: 0.0028, volume: 54_300_000, oi: 29_800_000, liq: 820_000, decimals: 3 },
  { symbol: "RTX5090-PERP", name: "RTX 5090 / hr", kind: "perp", base: 0.683, vol: 0.0061, volume: 23_100_000, oi: 11_200_000, liq: 1_140_000, decimals: 3 },
  { symbol: "INFER-IDX", name: "Inference Capacity Index", kind: "index", base: 1842.6, vol: 0.0019, volume: 38_500_000, oi: 21_700_000, liq: 0, decimals: 1 },
  { symbol: "TRAIN-IDX", name: "Training Capacity Index", kind: "index", base: 2318.4, vol: 0.0023, volume: 47_900_000, oi: 33_400_000, liq: 0, decimals: 1 },
];

export interface MarketSnapshot {
  markets: Market[];
  bySymbol: Record<string, Market>;
  tick: number;
  stats: {
    tvl: number;
    volume24h: number;
    openInterest: number;
    fundingAvg: number;
    utilization: number;
    liquidations24h: number;
  };
}

type Listener = () => void;

class MarketEngine {
  private markets: Market[] = [];
  private rands: Array<() => number> = [];
  private drift: number[] = [];
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private snapshot: MarketSnapshot;

  constructor() {
    this.markets = SEEDS.map((s) => {
      const rand = mulberry32(hashSeed(s.symbol));
      this.rands.push(rand);
      this.drift.push(0);
      // pre-roll history so charts are full on first paint
      const history: number[] = [];
      let p = s.base * (1 - 0.004 * gaussian(rand));
      for (let i = 0; i < HISTORY; i++) {
        p = this.step(p, s.base, s.vol, rand);
        history.push(p);
      }
      const price = history[history.length - 1];
      const open = history[0];
      return {
        symbol: s.symbol,
        name: s.name,
        kind: s.kind,
        price,
        basePrice: s.base,
        change24h: ((price - open) / open) * 100,
        funding: (rand() - 0.42) * 0.0002,
        volume24h: s.volume * (0.92 + rand() * 0.16),
        openInterest: s.oi * (0.94 + rand() * 0.12),
        liquidations24h: s.liq * (0.8 + rand() * 0.4),
        history,
        dir: 0,
        decimals: s.decimals,
      };
    });
    this.snapshot = this.buildSnapshot();
  }

  private step(p: number, base: number, vol: number, rand: () => number): number {
    const reversion = (base - p) / base;
    return p * (1 + gaussian(rand) * vol + reversion * 0.006);
  }

  private buildSnapshot(): MarketSnapshot {
    const bySymbol: Record<string, Market> = {};
    for (const m of this.markets) bySymbol[m.symbol] = m;
    const volume24h = this.markets.reduce((a, m) => a + m.volume24h, 0);
    const openInterest = this.markets.reduce((a, m) => a + m.openInterest, 0);
    const fundingAvg =
      this.markets.filter((m) => m.kind === "perp").reduce((a, m) => a + m.funding, 0) /
      this.markets.filter((m) => m.kind === "perp").length;
    return {
      markets: this.markets,
      bySymbol,
      tick: this.tick,
      stats: {
        tvl: 412_600_000 + openInterest * 0.6,
        volume24h,
        openInterest,
        fundingAvg,
        utilization: 0.87 + Math.sin(this.tick / 40) * 0.025,
        liquidations24h: this.markets.reduce((a, m) => a + m.liquidations24h, 0),
      },
    };
  }

  private advance = () => {
    this.tick++;
    this.markets = this.markets.map((m, i) => {
      const rand = this.rands[i];
      const seed = SEEDS[i];
      // slow drifting bias so trends persist for a few seconds at a time
      this.drift[i] = this.drift[i] * 0.96 + gaussian(rand) * 0.0009;
      const next =
        this.step(m.price, m.basePrice, seed.vol * 0.62, rand) * (1 + this.drift[i]);
      const history = [...m.history.slice(1), next];
      const open = history[0];
      return {
        ...m,
        price: next,
        history,
        change24h: ((next - open) / open) * 100,
        dir: next > m.price ? 1 : next < m.price ? -1 : 0,
        funding: m.funding * 0.985 + gaussian(rand) * 0.000004,
        volume24h: m.volume24h * (1 + gaussian(rand) * 0.0025),
        openInterest: m.openInterest * (1 + gaussian(rand) * 0.0014),
        liquidations24h:
          m.liquidations24h * 0.999 + (rand() < 0.06 ? rand() * 90_000 : 0),
      };
    });
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((l) => l());
  };

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    if (!this.timer && typeof window !== "undefined") {
      this.timer = setInterval(this.advance, TICK_MS);
    }
    return () => {
      this.listeners.delete(l);
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  };

  getSnapshot = (): MarketSnapshot => this.snapshot;

  /** Synthetic order book around the current mid, deterministic per tick. */
  book(symbol: string, levels = 18): MarketBook {
    const m = this.snapshot.bySymbol[symbol];
    if (!m) return { bids: [], asks: [], mid: 0 };
    const rand = mulberry32(hashSeed(symbol) ^ this.tick);
    const mid = m.price;
    const spread = mid * 0.0007;
    const bids: DepthLevel[] = [];
    const asks: DepthLevel[] = [];
    let bt = 0;
    let at = 0;
    for (let i = 0; i < levels; i++) {
      const off = spread + mid * 0.0011 * i * (1 + rand() * 0.3);
      const bsize = (1 + rand() * 4) * (1 + i * 0.35) * 40;
      const asize = (1 + rand() * 4) * (1 + i * 0.35) * 40;
      bt += bsize;
      at += asize;
      bids.push({ price: mid - off, size: bsize, total: bt });
      asks.push({ price: mid + off, size: asize, total: at });
    }
    return { bids, asks, mid };
  }
}

let engine: MarketEngine | null = null;

export function getEngine(): MarketEngine {
  if (!engine) engine = new MarketEngine();
  return engine;
}
