"use client";

import { useMemo } from "react";
import type { MarketBook } from "@/lib/market";

/**
 * Mirrored cumulative depth. Bids build left in signal blue, asks build
 * right in rose; the spread sits in the quiet middle.
 */
export default function DepthChart({
  book,
  width = 520,
  height = 140,
  className,
}: {
  book: MarketBook;
  width?: number;
  height?: number;
  className?: string;
}) {
  const { bidPath, askPath, midX } = useMemo(() => {
    const { bids, asks, mid } = book;
    if (!bids.length || !asks.length) return { bidPath: "", askPath: "", midX: width / 2 };
    const lo = bids[bids.length - 1].price;
    const hi = asks[asks.length - 1].price;
    const span = hi - lo || 1;
    const maxTotal = Math.max(bids[bids.length - 1].total, asks[asks.length - 1].total) || 1;
    const x = (p: number) => ((p - lo) / span) * width;
    const y = (t: number) => height - (t / maxTotal) * (height - 8);

    // step outline: bids walk out to the left from mid
    let bd = `M${x(mid).toFixed(1)},${height}`;
    let prevY = height;
    for (const lvl of bids) {
      const px = x(lvl.price);
      const py = y(lvl.total);
      bd += ` L${px.toFixed(1)},${prevY.toFixed(1)} L${px.toFixed(1)},${py.toFixed(1)}`;
      prevY = py;
    }
    bd += ` L${x(lo).toFixed(1)},${prevY.toFixed(1)} L${x(lo).toFixed(1)},${height} Z`;

    let ad = `M${x(mid).toFixed(1)},${height}`;
    prevY = height;
    for (const lvl of asks) {
      const px = x(lvl.price);
      const py = y(lvl.total);
      ad += ` L${px.toFixed(1)},${prevY.toFixed(1)} L${px.toFixed(1)},${py.toFixed(1)}`;
      prevY = py;
    }
    ad += ` L${x(hi).toFixed(1)},${prevY.toFixed(1)} L${x(hi).toFixed(1)},${height} Z`;

    return { bidPath: bd, askPath: ad, midX: x(mid) };
  }, [book, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="depth-bid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b7cff" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#5b7cff" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="depth-ask" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#fb7185" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d={bidPath} fill="url(#depth-bid)" stroke="#5b7cff" strokeOpacity="0.8" strokeWidth="1" />
      <path d={askPath} fill="url(#depth-ask)" stroke="#fb7185" strokeOpacity="0.7" strokeWidth="1" />
      <line
        x1={midX}
        y1="4"
        x2={midX}
        y2={height}
        stroke="#edf0f7"
        strokeOpacity="0.25"
        strokeDasharray="2 4"
      />
    </svg>
  );
}
