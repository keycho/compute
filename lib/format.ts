/**
 * Numeric formatting for market surfaces.
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

export function fmtFunding(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${(v * 100).toFixed(4)}%`;
}

export function fmtLatency(ms: number): string {
  return ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(1)}ms`;
}
