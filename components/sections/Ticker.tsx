"use client";

import { useProtocol } from "@/lib/useProtocol";
import { fmtLatency } from "@/lib/format";

/**
 * Full-bleed telemetry tape. Content is doubled for a seamless CSS
 * marquee; hovering pauses the belt so figures can be read.
 */
export default function Ticker() {
  const snap = useProtocol();

  const classItems = snap.classes.map((c) => (
    <span key={c.key} className="mx-7 inline-flex items-baseline gap-3 font-mono text-[12px]">
      <span className="font-medium tracking-[0.04em] text-ink">{c.key}</span>
      <span className="tnum text-dim">{c.available.toLocaleString("en-US")} free</span>
      <span className={`tnum ${c.utilization > 0.9 ? "text-neg" : "text-pos"}`}>
        {(c.utilization * 100).toFixed(1)}%
      </span>
      <span className="tnum text-[11px] text-mute">{fmtLatency(c.latency)}</span>
      <span className="ml-4 text-mute" aria-hidden>
        ◆
      </span>
    </span>
  ));

  const regionItems = snap.regions.slice(0, 4).map((r) => (
    <span key={r.key} className="mx-7 inline-flex items-baseline gap-3 font-mono text-[12px]">
      <span className="tracking-[0.04em] text-dim">{r.key}</span>
      <span className="tnum text-ink">{r.pflops.toFixed(1)} PF</span>
      <span className={`tnum ${r.delta >= 0 ? "text-pos" : "text-neg"}`}>
        {r.delta >= 0 ? "+" : ""}
        {r.delta.toFixed(2)}%
      </span>
      <span className="ml-4 text-mute" aria-hidden>
        ◆
      </span>
    </span>
  ));

  const items = [...classItems, ...regionItems];

  return (
    <div className="hairline-t hairline-b relative overflow-hidden bg-[rgba(5,5,7,0.55)] py-3">
      <div className="flex w-max animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
        <div className="flex items-center">{items}</div>
        <div className="flex items-center" aria-hidden>
          {items}
        </div>
      </div>
    </div>
  );
}
