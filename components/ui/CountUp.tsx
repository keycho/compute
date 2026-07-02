"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tween a numeric readout toward its target whenever the target moves.
 * Formatting is delegated so tiles can render $, %, or compact units.
 */
export default function CountUp({
  value,
  format,
  duration = 700,
  className,
}: {
  value: number;
  format: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * e;
      setShown(v);
      fromRef.current = v;
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span className={`tnum ${className ?? ""}`}>{format(shown)}</span>;
}
