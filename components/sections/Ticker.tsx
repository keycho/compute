"use client";

import { useFeed } from "@/lib/useFeed";
import { itemStatusLabel, itemTitle } from "@/components/ui/feedFormat";

/**
 * Event tape: the last stretch of the feed scrolling by. Doubled for a
 * seamless marquee; hover pauses it.
 */
export default function Ticker() {
  const snap = useFeed();

  const items = snap.items.slice(0, 14).map((i) => {
    const s = itemStatusLabel(i);
    return (
      <span key={i.id} className="mx-7 inline-flex items-baseline gap-3 font-mono text-[12px]">
        <span className="tracking-[0.02em] text-dim">{itemTitle(i)}</span>
        <span className={s.cls}>{s.label}</span>
        {i.kind === "job" && i.status === "running" && (
          <span className="tnum text-mute">{Math.round(i.latencyNow)}ms</span>
        )}
        {i.kind === "job" && i.status === "completed" && i.reward !== undefined && (
          <span className="tnum text-mute">${i.reward.toFixed(2)}</span>
        )}
        <span className="ml-4 text-mute" aria-hidden>
          ◆
        </span>
      </span>
    );
  });

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
