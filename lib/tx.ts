/**
 * Transaction toasts: the pending → confirmed lifecycle every dapp
 * action reports through. Module-singleton store; TxToasts renders it
 * globally. Hashes are local (this is a session, not a chain), but the
 * lifecycle — submit, pend, confirm, link out — is the real mechanic.
 */

import { useSyncExternalStore } from "react";

export interface Tx {
  id: number;
  label: string;
  hash: string;
  status: "pending" | "confirmed";
}

let txs: Tx[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  txs = [...txs];
  listeners.forEach((l) => l());
}

function mintHash(): string {
  const hex = "0123456789abcdef";
  let h = "0x";
  for (let i = 0; i < 10; i++) h += hex[Math.floor(Math.random() * 16)];
  return h;
}

export const txStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot(): Tx[] {
    return txs;
  },
  getServerSnapshot(): Tx[] {
    return [];
  },

  submit(label: string): Tx {
    const tx: Tx = { id: nextId++, label, hash: mintHash(), status: "pending" };
    txs.push(tx);
    emit();
    // confirm after a network-ish delay, dismiss a while later
    setTimeout(() => {
      const t = txs.find((x) => x.id === tx.id);
      if (t) {
        t.status = "confirmed";
        emit();
      }
      setTimeout(() => {
        txs = txs.filter((x) => x.id !== tx.id);
        emit();
      }, 6000);
    }, 1100 + Math.random() * 1700);
    return tx;
  },

  dismiss(id: number) {
    txs = txs.filter((x) => x.id !== id);
    emit();
  },
};

export function useTxs(): Tx[] {
  return useSyncExternalStore(txStore.subscribe, txStore.getSnapshot, txStore.getServerSnapshot);
}
