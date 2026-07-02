"use client";

import { useMemo, useState } from "react";
import { useMarkets } from "@/lib/useMarkets";
import { getEngine } from "@/lib/market";
import { fmtCompact, fmtFunding, fmtPct, fmtPrice } from "@/lib/format";
import { hashSeed, mulberry32 } from "@/lib/prng";
import CountUp from "@/components/ui/CountUp";
import DepthChart from "@/components/ui/DepthChart";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import Sparkline from "@/components/ui/Sparkline";

/**
 * The institutional read on the network: aggregate stats, flow, funding
 * surface, and the live book. Everything on this surface moves with the
 * same tape as the hero terminal.
 */

function StatTile({
  label,
  value,
  format,
  sub,
  accent,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  sub?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="glass glow-hover flex flex-col gap-2 p-6">
      <span className="col-heading">{label}</span>
      <CountUp
        value={value}
        format={format}
        className={`font-display text-[clamp(1.6rem,2.4vw,2.3rem)] font-semibold tracking-[-0.02em] ${accent ? "text-signal-bright" : "text-ink"}`}
      />
      {sub && <span className="font-mono text-[11px] text-mute">{sub}</span>}
    </div>
  );
}

function FundingHeatmap() {
  const snap = useMarkets();
  // 12 funding windows per market, seeded per tick-decade so the surface
  // shifts slowly rather than flickering
  const cells = useMemo(() => {
    const epoch = Math.floor(snap.tick / 8);
    return snap.markets.map((m) => {
      const rand = mulberry32(hashSeed(m.symbol) ^ epoch);
      return Array.from({ length: 12 }, (_, i) => {
        const base = m.funding * (0.7 + i * 0.05);
        return base + (rand() - 0.5) * 0.00012;
      });
    });
  }, [snap.tick, snap.markets]);

  return (
    <div>
      <div className="grid grid-cols-[92px_1fr] items-center gap-x-3 gap-y-[5px]">
        {snap.markets.map((m, r) => (
          <div key={m.symbol} className="contents">
            <span className="truncate font-mono text-[10.5px] tracking-[0.04em] text-mute">
              {m.symbol}
            </span>
            <div className="grid grid-cols-12 gap-[5px]">
              {cells[r].map((v, c) => {
                const mag = Math.min(Math.abs(v) / 0.00018, 1);
                const color =
                  v >= 0
                    ? `rgba(91, 124, 255, ${0.08 + mag * 0.55})`
                    : `rgba(251, 113, 133, ${0.08 + mag * 0.5})`;
                return (
                  <span
                    key={c}
                    className="h-[18px] rounded-[2px] transition-colors duration-700"
                    style={{ backgroundColor: color }}
                    title={`${m.symbol} · ${fmtFunding(v)}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
        <span>−96h</span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-[1px] bg-[rgba(251,113,133,0.5)]" /> shorts pay
          <span className="ml-3 h-2 w-2 rounded-[1px] bg-[rgba(91,124,255,0.5)]" /> longs pay
        </span>
        <span>now</span>
      </div>
    </div>
  );
}

export default function Analytics() {
  const snap = useMarkets();
  const [selected, setSelected] = useState("B200-PERP");
  const book = getEngine().book(selected, 18);

  const mostActive = [...snap.markets].sort((a, b) => b.volume24h - a.volume24h);
  const gainers = [...snap.markets].sort((a, b) => b.change24h - a.change24h).slice(0, 3);
  const maxVol = mostActive[0]?.volume24h ?? 1;

  return (
    <section className="relative py-[clamp(110px,14vh,170px)]" id="analytics">
      <SectionHeader
        chip="NETWORK ANALYTICS"
        title={
          <>
            The state of the network,
            <br />
            marked to market<span className="text-signal">.</span>
          </>
        }
        body="Aggregates are computed from on-chain settlement data and oracle telemetry. Every figure below updates as blocks land."
      />

      {/* stat rail */}
      <div className="container-x mt-20 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Reveal>
          <StatTile
            label="Value locked"
            value={snap.stats.tvl}
            format={(v) => fmtCompact(v)}
            sub="protocol collateral"
          />
        </Reveal>
        <Reveal delay={0.06}>
          <StatTile
            label="24h volume"
            value={snap.stats.volume24h}
            format={(v) => fmtCompact(v)}
            sub="across 6 markets"
          />
        </Reveal>
        <Reveal delay={0.12}>
          <StatTile
            label="Avg funding"
            value={snap.stats.fundingAvg}
            format={(v) => fmtFunding(v)}
            sub="8h window"
            accent
          />
        </Reveal>
        <Reveal delay={0.18}>
          <StatTile
            label="Open interest"
            value={snap.stats.openInterest}
            format={(v) => fmtCompact(v)}
            sub="net notional"
          />
        </Reveal>
        <Reveal delay={0.24}>
          <StatTile
            label="Utilization"
            value={snap.stats.utilization * 100}
            format={(v) => `${v.toFixed(1)}%`}
            sub="mesh-wide GPU load"
            accent
          />
        </Reveal>
      </div>

      {/* main grid */}
      <div className="container-x mt-5 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* most active */}
        <Reveal className="glass reticle p-6">
          <div className="mb-5 flex items-center justify-between">
            <span className="col-heading">Most active markets</span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
              24h notional
            </span>
          </div>
          <div className="flex flex-col">
            {mostActive.map((m) => (
              <button
                key={m.symbol}
                onClick={() => setSelected(m.symbol)}
                className={`group grid grid-cols-[1.1fr_2fr_0.9fr_0.7fr] items-center gap-3 border-b border-line py-3 text-left last:border-b-0 ${
                  selected === m.symbol ? "bg-[rgba(91,124,255,0.05)]" : ""
                }`}
              >
                <span className="font-mono text-[12.5px] font-medium text-ink">{m.symbol}</span>
                <span className="relative h-[5px] overflow-hidden rounded-full bg-[rgba(235,240,255,0.06)]">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[rgba(91,124,255,0.5)] to-[rgba(139,92,246,0.7)] transition-[width] duration-700"
                    style={{ width: `${(m.volume24h / maxVol) * 100}%` }}
                  />
                </span>
                <span className="tnum text-right font-mono text-[12px] text-dim">
                  {fmtCompact(m.volume24h)}
                </span>
                <span
                  className={`tnum text-right font-mono text-[12px] ${m.change24h >= 0 ? "text-pos" : "text-neg"}`}
                >
                  {fmtPct(m.change24h)}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-7 flex items-center justify-between">
            <span className="col-heading">Top gainers</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {gainers.map((m) => (
              <div key={m.symbol} className="rounded-[10px] border border-line p-3.5">
                <p className="font-mono text-[11px] text-mute">{m.symbol}</p>
                <p
                  className={`tnum mt-1 font-display text-[19px] font-semibold ${m.change24h >= 0 ? "text-pos" : "text-neg"}`}
                >
                  {fmtPct(m.change24h)}
                </p>
                <Sparkline data={m.history.slice(-40)} up={m.change24h >= 0} width={110} height={26} />
              </div>
            ))}
          </div>
        </Reveal>

        {/* funding heatmap + depth */}
        <div className="flex flex-col gap-4">
          <Reveal delay={0.08} className="glass reticle p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="col-heading">Funding surface</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                8h windows
              </span>
            </div>
            <FundingHeatmap />
          </Reveal>

          <Reveal delay={0.14} className="glass reticle flex-1 p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="col-heading">Market depth</span>
              <div className="flex gap-1.5">
                {snap.markets
                  .filter((m) => m.kind === "perp")
                  .map((m) => (
                    <button
                      key={m.symbol}
                      onClick={() => setSelected(m.symbol)}
                      className={`rounded-[2px] border px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.06em] transition-colors duration-150 ${
                        selected === m.symbol
                          ? "border-[rgba(91,124,255,0.5)] bg-[rgba(91,124,255,0.1)] text-signal-bright"
                          : "border-line text-mute hover:text-dim"
                      }`}
                    >
                      {m.symbol.replace("-PERP", "")}
                    </button>
                  ))}
              </div>
            </div>
            <DepthChart book={book} width={520} height={150} className="h-[130px] w-full" />
            <div className="mt-3 flex justify-between font-mono text-[10.5px] text-mute">
              <span className="tnum">
                bid {fmtPrice(book.bids[0]?.price ?? 0, snap.bySymbol[selected]?.decimals)}
              </span>
              <span className="tnum text-ink">
                {selected} · mid {fmtPrice(book.mid, snap.bySymbol[selected]?.decimals)}
              </span>
              <span className="tnum">
                ask {fmtPrice(book.asks[0]?.price ?? 0, snap.bySymbol[selected]?.decimals)}
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
