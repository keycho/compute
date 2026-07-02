"use client";

import { useMarkets } from "@/lib/useMarkets";
import { fmtFunding, fmtPct, fmtPrice } from "@/lib/format";

/**
 * Full-bleed tape. Content is doubled for a seamless CSS marquee;
 * hovering pauses the belt so numbers can be read.
 */
export default function Ticker() {
  const snap = useMarkets();

  const items = snap.markets.map((m) => (
    <span key={m.symbol} className="mx-7 inline-flex items-baseline gap-3 font-mono text-[12px]">
      <span className="font-medium tracking-[0.04em] text-ink">{m.symbol}</span>
      <span className="tnum text-dim">{fmtPrice(m.price, m.decimals)}</span>
      <span className={`tnum ${m.change24h >= 0 ? "text-pos" : "text-neg"}`}>
        {fmtPct(m.change24h)}
      </span>
      <span className="tnum text-[11px] text-mute">{fmtFunding(m.funding)}</span>
      <span className="ml-4 text-faint" aria-hidden>
        ◆
      </span>
    </span>
  ));

  return (
    <div className="hairline-t hairline-b relative overflow-hidden bg-[rgba(10,10,14,0.4)] py-3">
      <div className="flex w-max animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
        <div className="flex items-center">{items}</div>
        <div className="flex items-center" aria-hidden>
          {items}
        </div>
      </div>
    </div>
  );
}
