/**
 * Numeric formatting for protocol surfaces.
 * Terminal conventions: tabular figures, explicit signs, compact magnitudes.
 */

export function fmtPrice(v: number, decimals?: number): string {
  const d = decimals ?? (v >= 1000 ? 1 : v >= 10 ? 2 : 3);
  return v.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export function fmtUsd(v: number): string {
  return `$${fmtPrice(v)}`;
}

export function fmtCompact(v: number, prefix = "$"): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${prefix}${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${prefix}${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${prefix}${(v / 1e3).toFixed(1)}K`;
  return `${prefix}${v.toFixed(0)}`;
}

export function fmtPct(v: number, digits = 2): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

export function fmtLatency(ms: number): string {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(1)}ms`;
}

/** 14,426 → "14,4xx" — deliberately approximate counts */
export function fmtMasked(v: number): string {
  const s = Math.round(v).toLocaleString("en-US");
  return s.length <= 2 ? s : s.slice(0, -2) + "xx";
}

/** 38412 → "~38k" */
export function fmtTilde(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `~${(v / 1e6).toFixed(1)}m`;
  if (abs >= 1e3) return `~${Math.round(v / 1e3)}k`;
  return `~${Math.round(v)}`;
}

/** latency band: "70–110ms" */
export function fmtRangeMs(lo: number, hi: number): string {
  return `${Math.round(lo)}–${Math.round(hi)}ms`;
}

/** drifting band: "~38k–41k" */
export function fmtTildeRange(lo: number, hi: number): string {
  const k = (v: number) => (Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)}k` : `${Math.round(v)}`);
  return `~${k(lo)}\u2013${k(hi)}`;
}
