"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";
import { useMarkets } from "@/lib/useMarkets";
import { getEngine } from "@/lib/market";
import { fmtCompact, fmtFunding, fmtPct, fmtPrice } from "@/lib/format";
import Sparkline from "@/components/ui/Sparkline";
import DepthChart from "@/components/ui/DepthChart";

/**
 * The hero instrument: a floating glass terminal streaming the six core
 * markets, with the live book for whichever market is armed. Pointer
 * tilt gives it physical presence; every tick flashes the cell it moved.
 */
export default function MarketTerminal() {
  const snap = useMarkets();
  const [selected, setSelected] = useState("H100-PERP");
  const reduced = useReducedMotion();

  const rx = useSpring(0, { stiffness: 60, damping: 14 });
  const ry = useSpring(0, { stiffness: 60, damping: 14 });
  const frame = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    if (reduced || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    rx.set(py * -4.5);
    ry.set(px * 6);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  const book = getEngine().book(selected, 16);
  const sel = snap.bySymbol[selected];

  return (
    <motion.div
      ref={frame}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      className="glass reticle relative w-full max-w-[540px] shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <span className="col-heading">Live markets</span>
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse-dot" aria-hidden />
          mainnet · 12ms
        </span>
      </div>

      {/* rows */}
      <div aria-label="Live markets">
        <div
          aria-hidden
          className="grid grid-cols-[1.35fr_1fr_0.75fr_88px] items-center gap-2 px-5 pb-1 pt-3 font-mono text-[10.5px] uppercase tracking-[0.13em] text-mute"
        >
          <span>Market</span>
          <span className="text-right">Price</span>
          <span className="text-right">24h</span>
          <span className="text-right">Trend</span>
        </div>
        {snap.markets.map((m) => {
          const active = m.symbol === selected;
          return (
            <button
              key={m.symbol}
              aria-pressed={active}
              aria-label={`Show depth for ${m.symbol}`}
              onClick={() => setSelected(m.symbol)}
              className={`grid w-full grid-cols-[1.35fr_1fr_0.75fr_88px] items-center gap-2 border-l-2 px-5 py-[9px] text-left transition-colors duration-150 ${
                active
                  ? "border-signal bg-[rgba(91,124,255,0.06)]"
                  : "border-transparent hover:bg-[rgba(235,240,255,0.03)]"
              }`}
            >
              <span className="flex flex-col">
                <span className="font-mono text-[13px] font-medium tracking-[0.02em] text-ink">
                  {m.symbol}
                </span>
                <span className="font-mono text-[10px] text-mute">
                  {fmtFunding(m.funding)} fund
                </span>
              </span>
              <span
                key={`${m.symbol}-${m.price.toFixed(m.decimals)}`}
                className={`tnum text-right font-mono text-[13px] text-ink ${
                  m.dir > 0 ? "flash-pos" : m.dir < 0 ? "flash-neg" : ""
                }`}
              >
                {fmtPrice(m.price, m.decimals)}
              </span>
              <span
                className={`tnum text-right font-mono text-[12px] ${m.change24h >= 0 ? "text-pos" : "text-neg"}`}
              >
                {fmtPct(m.change24h)}
              </span>
              <Sparkline data={m.history} up={m.change24h >= 0} className="justify-self-end" />
            </button>
          );
        })}
      </div>

      {/* depth */}
      <div className="border-t border-line px-5 pb-4 pt-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="col-heading">Depth · {selected}</span>
          <span className="tnum font-mono text-[11px] text-mute">
            OI {fmtCompact(sel?.openInterest ?? 0)} · Vol {fmtCompact(sel?.volume24h ?? 0)}
          </span>
        </div>
        <DepthChart book={book} width={520} height={110} className="h-[96px] w-full" />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-faint">
          <span>bids</span>
          <span className="text-mute tnum">mid {fmtPrice(book.mid, sel?.decimals)}</span>
          <span>asks</span>
        </div>
      </div>

      {/* liquidation strip */}
      <div className="flex items-center justify-between border-t border-line px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
        <span>
          24h liquidations{" "}
          <span className="text-neg tnum">{fmtCompact(snap.stats.liquidations24h)}</span>
        </span>
        <span>
          funding avg{" "}
          <span className="text-signal-bright tnum">{fmtFunding(snap.stats.fundingAvg)}</span>
        </span>
      </div>
    </motion.div>
  );
}
