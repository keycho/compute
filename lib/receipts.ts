/**
 * Execution receipts.
 *
 * Every execution — an answer streamed on /execute, a frame rendered on
 * /create — leaves a receipt: job hash, worker, model, gpu, runtime,
 * cost. Receipts are the thread that ties the consumer surfaces to the
 * protocol: "view block" on any receipt opens that job in the explorer.
 *
 * Stored in module memory with a sessionStorage mirror so the explorer
 * can resolve a receipt after a client-side navigation or a reload
 * within the same tab.
 */

export interface Receipt {
  hash: string;
  kind: "inference" | "image";
  prompt: string;
  model: string;
  node: string;
  gpu: string;
  runtimeMs: number;
  costUsdc: number;
}

const KEY = "q0r-receipts";
const MAX = 40;

let memory: Receipt[] = [];

function readSession(): Receipt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Receipt[]) : [];
  } catch {
    return [];
  }
}

function writeSession(rs: Receipt[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(rs));
  } catch {
    // storage full or unavailable — memory copy still works this page
  }
}

export function saveReceipt(r: Receipt): void {
  memory = [r, ...memory.filter((m) => m.hash !== r.hash)].slice(0, MAX);
  writeSession(memory);
}

export function getReceipt(hash: string): Receipt | null {
  const hit = memory.find((r) => r.hash === hash);
  if (hit) return hit;
  const stored = readSession();
  if (stored.length && !memory.length) memory = stored;
  return stored.find((r) => r.hash === hash) ?? null;
}
