"use client";

import { useId, useMemo } from "react";

/**
 * Inline price history. Stroke tints by direction; a soft area fill
 * fades to nothing so rows stay quiet at rest.
 */
export default function Sparkline({
  data,
  width = 76,
  height = 22,
  up,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  up: boolean;
  className?: string;
}) {
  const gid = useId();
  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: "", area: "" };
    let min = Infinity;
    let max = -Infinity;
    for (const v of data) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const span = max - min || 1;
    const pad = 2;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const line = `M${pts.join(" L")}`;
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [data, width, height]);

  const color = up ? "#34d399" : "#fb7185";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}
