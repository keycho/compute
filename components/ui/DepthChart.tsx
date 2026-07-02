"use client";

import { useMemo } from "react";
import type { CapacityCurve } from "@/lib/protocol";

/**
 * Capacity/load curve: cumulative available capacity builds left in
 * signal blue, cumulative allocated load builds right in violet, both
 * binned by routing latency. The dashed line marks the class's current
 * median routing point.
 */
export default function DepthChart({
  curve,
  width = 520,
  height = 140,
  className,
}: {
  curve: CapacityCurve;
  width?: number;
  height?: number;
  className?: string;
}) {
  const { capPath, loadPath, midX } = useMemo(() => {
    const { capacity, load, mid } = curve;
    if (!capacity.length || !load.length) return { capPath: "", loadPath: "", midX: width / 2 };
    const lo = capacity[capacity.length - 1].x;
    const hi = load[load.length - 1].x;
    const span = hi - lo || 1;
    const maxTotal = Math.max(capacity[capacity.length - 1].total, load[load.length - 1].total) || 1;
    const x = (v: number) => ((v - lo) / span) * width;
    const y = (t: number) => height - (t / maxTotal) * (height - 8);

    const step = (levels: typeof capacity) => {
      let d = `M${x(mid).toFixed(1)},${height}`;
      let prevY = height;
      for (const lvl of levels) {
        const px = x(lvl.x);
        const py = y(lvl.total);
        d += ` L${px.toFixed(1)},${prevY.toFixed(1)} L${px.toFixed(1)},${py.toFixed(1)}`;
        prevY = py;
      }
      const endX = x(levels[levels.length - 1].x);
      return `${d} L${endX.toFixed(1)},${prevY.toFixed(1)} L${endX.toFixed(1)},${height} Z`;
    };

    return { capPath: step(capacity), loadPath: step(load), midX: x(mid) };
  }, [curve, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="curve-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5b7cff" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#5b7cff" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="curve-load" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d={capPath} fill="url(#curve-cap)" stroke="#5b7cff" strokeOpacity="0.8" strokeWidth="1" />
      <path d={loadPath} fill="url(#curve-load)" stroke="#8b5cf6" strokeOpacity="0.75" strokeWidth="1" />
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
