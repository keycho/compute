/**
 * Wallet session.
 *
 * Real dapp mechanics with graceful degradation: if the visitor has an
 * injected provider (metamask, rabby, …) we request accounts from it.
 * If not, a local session wallet is minted once and persisted, so the
 * whole dapp surface — balances, staking, claims — still works end to
 * end. Module-singleton store consumed via useSyncExternalStore.
 */

import { useSyncExternalStore } from "react";
import { hashSeed, mulberry32 } from "./prng";

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: EthProvider;
  }
}

export interface WalletState {
  status: "disconnected" | "connecting" | "connected";
  source: "injected" | "local" | null;
  address: string | null;
  /** balances are locally simulated — deterministic per address */
  q0r: number;
  usdc: number;
  staked: number;
  /** supply earnings accrual */
  pendingBase: number;
  lastClaim: number;
  createdAt: number;
}

const KEY = "q0r-wallet-v1";
/** claimable accrues while the worker is "attached" to this wallet */
export const ACCRUAL_PER_SEC = 0.0021;

const DISCONNECTED: WalletState = {
  status: "disconnected",
  source: null,
  address: null,
  q0r: 0,
  usdc: 0,
  staked: 0,
  pendingBase: 0,
  lastClaim: 0,
  createdAt: 0,
};

let state: WalletState = DISCONNECTED;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    if (state.status === "connected") {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } else {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    // private mode etc — session still works in memory
  }
}

function seedBalances(address: string, now: number): WalletState {
  const r = mulberry32(hashSeed(address.toLowerCase()));
  return {
    status: "connected",
    source: "local",
    address,
    q0r: Math.round((1_200 + r() * 84_000) * 100) / 100,
    usdc: Math.round((18 + r() * 640) * 100) / 100,
    staked: 0,
    pendingBase: Math.round((6 + r() * 38) * 100) / 100,
    lastClaim: now,
    createdAt: now,
  };
}

function mintLocalAddress(): string {
  const hex = "0123456789abcdef";
  let a = "0x";
  const rand = mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  for (let i = 0; i < 40; i++) a += hex[Math.floor(rand() * 16)];
  return a;
}

export const wallet = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot(): WalletState {
    return state;
  },
  getServerSnapshot(): WalletState {
    return DISCONNECTED;
  },

  /** restore a persisted session after mount (SSR-safe) */
  init() {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<WalletState>;
      if (parsed && parsed.status === "connected" && typeof parsed.address === "string") {
        state = { ...seedBalances(parsed.address, Date.now()), ...parsed } as WalletState;
        emit();
      }
    } catch {
      // corrupted persisted state must never break the page
    }
  },

  async connect() {
    if (state.status === "connected") return;
    state = { ...DISCONNECTED, status: "connecting" };
    emit();

    let address: string | null = null;
    let source: WalletState["source"] = "local";
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const accounts = (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[];
        if (accounts?.[0]) {
          address = accounts[0];
          source = "injected";
        }
      }
    } catch {
      // user rejected the injected request — fall through to local
    }
    if (!address) {
      // reuse the previously minted local wallet if one exists
      try {
        const prior = window.localStorage.getItem(`${KEY}-addr`);
        address = prior ?? mintLocalAddress();
        window.localStorage.setItem(`${KEY}-addr`, address);
      } catch {
        address = mintLocalAddress();
      }
    }

    state = { ...seedBalances(address, Date.now()), source };
    persist();
    emit();
  },

  disconnect() {
    state = DISCONNECTED;
    persist();
    emit();
  },

  stake(amount: number): boolean {
    if (state.status !== "connected" || amount <= 0 || amount > state.q0r) return false;
    state = {
      ...state,
      q0r: Math.round((state.q0r - amount) * 100) / 100,
      staked: Math.round((state.staked + amount) * 100) / 100,
    };
    persist();
    emit();
    return true;
  },

  unstake(amount: number): boolean {
    if (state.status !== "connected" || amount <= 0 || amount > state.staked) return false;
    state = {
      ...state,
      staked: Math.round((state.staked - amount) * 100) / 100,
      q0r: Math.round((state.q0r + amount) * 100) / 100,
    };
    persist();
    emit();
    return true;
  },

  claimable(now = Date.now()): number {
    if (state.status !== "connected") return 0;
    const accrued = ((now - state.lastClaim) / 1000) * ACCRUAL_PER_SEC;
    return Math.round((state.pendingBase + accrued) * 10000) / 10000;
  },

  claim(): number {
    if (state.status !== "connected") return 0;
    const amount = this.claimable();
    if (amount <= 0) return 0;
    state = {
      ...state,
      usdc: Math.round((state.usdc + amount) * 100) / 100,
      pendingBase: 0,
      lastClaim: Date.now(),
    };
    persist();
    emit();
    return Math.round(amount * 100) / 100;
  },
};

export function useWallet(): WalletState {
  return useSyncExternalStore(wallet.subscribe, wallet.getSnapshot, wallet.getServerSnapshot);
}

export function shortAddr(a: string | null): string {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
