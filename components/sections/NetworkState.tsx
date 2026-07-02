"use client";

import { useMemo, useState } from "react";
import { useProtocol } from "@/lib/useProtocol";
import { getProtocol } from "@/lib/protocol";
import { fmtCompact, fmtLatency } from "@/lib/format";
import { hashSeed, mulberry32 } from "@/lib/prng";
import CountUp from "@/components/ui/CountUp";
import DepthChart from "@/components/ui/DepthChart";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import Sparkline from "@/components/ui/Sparkline";

/**
 * The operational read on the mesh: aggregate state, class utilization,
 * regional capacity, the utilization surface, and the live capacity/load
 * curve. Everything derives from the same protocol simulation as the
 * hero telemetry.
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

function UtilizationSurface() {
  const snap = useProtocol();
  // 12 windows per class, re-seeded slowly so the surface shifts rather
  // than flickers; intensity = load, derived from live class utilization
  const cells = useMemo(() => {
    const epoch = Math.floor(snap.tick / 8);
    return snap.classes.map((c) => {
      const rand = mulberry32(hashSeed(c.key) ^ epoch);
      return Array.from({ length: 12 }, (_, i) => {
        const drift = (i - 11) * 0.006;
        return Math.min(1, Math.max(0, c.utilization + drift + (rand() - 0.5) * 0.08));
      });
    });
  }, [snap.tick, snap.classes]);

  return (
    <div>
      <div className="grid grid-cols-[92px_1fr] items-center gap-x-3 gap-y-[5px]">
        {snap.classes.map((c, r) => (
          <div key={c.key} className="contents">
            <span className="truncate font-mono text-[10.5px] tracking-[0.04em] text-mute">
              {c.key}
            </span>
            <div className="grid grid-cols-12 gap-[5px]">
              {cells[r].map((v, i) => (
                <span
                  key={i}
                  className="h-[18px] rounded-[2px] transition-colors duration-700"
                  style={{
                    backgroundColor:
                      v > 0.55
                        ? `rgba(91, 124, 255, ${0.1 + (v - 0.55) * 1.3})`
                        : `rgba(235, 240, 255, ${0.03 + v * 0.07})`,
                  }}
                  title={`${c.key} · ${(v * 100).toFixed(1)}% load`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
        <span>−96h</span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-[1px] bg-[rgba(235,240,255,0.08)]" /> spare
          <span className="ml-3 h-2 w-2 rounded-[1px] bg-[rgba(91,124,255,0.6)]" /> saturated
        </span>
        <span>now</span>
      </div>
    </div>
  );
}

export default function NetworkState() {
  const snap = useProtocol();
  const [selected, setSelected] = useState("B200");
  const curve = getProtocol().curve(selected, 18);

  const classes = snap.classes;
  const regions = snap.regions.slice(0, 3);
  const maxAvail = classes[0]?.available ?? 1;

  return (
    <section className="relative py-[clamp(110px,14vh,170px)]" id="network">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,3,4,0.6), rgba(3,3,4,0.42) 40%, rgba(3,3,4,0.72))",
        }}
      />
      <div className="relative">
        <SectionHeader
          chip="NETWORK STATE"
          title={
            <>
              The network,
              <br />
              observed live<span className="text-signal">.</span>
            </>
          }
          body="Every figure derives from live protocol state: providers, capacity, routing, and verified execution across the mesh. Nothing here is hand-entered."
        />

        {/* stat rail */}
        <div className="container-x mt-20 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Reveal>
            <StatTile
              label="Active providers"
              value={snap.providers}
              format={(v) => Math.round(v).toLocaleString("en-US")}
              sub="staked and reachable"
            />
          </Reveal>
          <Reveal delay={0.05}>
            <StatTile
              label="Network capacity"
              value={snap.capacityPflops}
              format={(v) => `${Math.round(v)} PF`}
              sub="allocated + free"
              accent
            />
          </Reveal>
          <Reveal delay={0.1}>
            <StatTile
              label="Jobs in queue"
              value={snap.queueDepth}
              format={(v) => fmtCompact(v, "")}
              sub="awaiting placement"
            />
          </Reveal>
          <Reveal delay={0.15}>
            <StatTile
              label="Execution rate"
              value={snap.throughputJobsMin}
              format={(v) => `${fmtCompact(v, "")}/min`}
              sub="verified executions"
            />
          </Reveal>
          <Reveal delay={0.2}>
            <StatTile
              label="Utilization"
              value={snap.utilization * 100}
              format={(v) => `${v.toFixed(1)}%`}
              sub="mesh-wide GPU load"
              accent
            />
          </Reveal>
          <Reveal delay={0.25}>
            <StatTile
              label="Latency"
              value={snap.medianLatencyMs}
              format={(v) => `${Math.round(v)}ms`}
              sub="median · submit → placement"
            />
          </Reveal>
          <Reveal delay={0.3}>
            <StatTile
              label="Network health"
              value={snap.networkHealth}
              format={(v) => `${v.toFixed(2)}%`}
              sub="verification × reliability"
              accent
            />
          </Reveal>
          <Reveal delay={0.35}>
            <StatTile
              label="Available GPUs"
              value={snap.availableGpus}
              format={(v) => fmtCompact(v, "")}
              sub="ready for placement"
            />
          </Reveal>
        </div>

        {/* main grid */}
        <div className="container-x mt-5 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          {/* provider classes */}
          <Reveal className="glass reticle p-6">
            <div className="mb-5 flex items-center justify-between">
              <span className="col-heading">Provider classes</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                available GPUs
              </span>
            </div>
            <div className="flex flex-col">
              {classes.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setSelected(c.key)}
                  aria-pressed={selected === c.key}
                  className={`group grid grid-cols-[1fr_2fr_0.9fr_0.7fr] items-center gap-3 border-b border-line py-3 text-left last:border-b-0 ${
                    selected === c.key ? "bg-[rgba(91,124,255,0.05)]" : ""
                  }`}
                >
                  <span className="font-mono text-[12.5px] font-medium text-ink">{c.key}</span>
                  <span className="relative h-[5px] overflow-hidden rounded-full bg-[rgba(235,240,255,0.06)]">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[rgba(91,124,255,0.5)] to-[rgba(139,92,246,0.7)] transition-[width] duration-700"
                      style={{ width: `${(c.available / maxAvail) * 100}%` }}
                    />
                  </span>
                  <span className="tnum text-right font-mono text-[12px] text-dim">
                    {c.available.toLocaleString("en-US")}
                  </span>
                  <span
                    className={`tnum text-right font-mono text-[12px] ${c.utilization > 0.9 ? "text-neg" : "text-pos"}`}
                  >
                    {(c.utilization * 100).toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-7 flex items-center justify-between">
              <span className="col-heading">Top regions</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                capacity · 96h
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {regions.map((r) => (
                <div key={r.key} className="rounded-[10px] border border-line p-3.5">
                  <p className="font-mono text-[11px] text-mute">{r.key}</p>
                  <p className="tnum mt-1 font-display text-[19px] font-semibold text-ink">
                    {r.pflops.toFixed(1)} PF
                  </p>
                  <Sparkline data={r.history.slice(-40)} up={r.delta >= 0} width={110} height={26} />
                </div>
              ))}
            </div>
          </Reveal>

          {/* utilization surface + capacity curve */}
          <div className="flex flex-col gap-4">
            <Reveal delay={0.08} className="glass reticle p-6">
              <div className="mb-5 flex items-center justify-between">
                <span className="col-heading">Utilization surface</span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                  8h windows
                </span>
              </div>
              <UtilizationSurface />
            </Reveal>

            <Reveal delay={0.14} className="glass reticle flex-1 p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="col-heading">Capacity / load</span>
                <div className="flex gap-1.5">
                  {classes.slice(0, 4).map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setSelected(c.key)}
                      aria-pressed={selected === c.key}
                      className={`rounded-[2px] border px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.06em] transition-colors duration-150 ${
                        selected === c.key
                          ? "border-[rgba(91,124,255,0.5)] bg-[rgba(91,124,255,0.1)] text-signal-bright"
                          : "border-line text-mute hover:text-dim"
                      }`}
                    >
                      {c.key}
                    </button>
                  ))}
                </div>
              </div>
              <DepthChart curve={curve} width={520} height={150} className="h-[130px] w-full" />
              <div className="mt-3 flex justify-between font-mono text-[10.5px] text-mute">
                <span className="text-signal-bright">available capacity</span>
                <span className="tnum text-ink">
                  {selected} · median {fmtLatency(curve.mid)}
                </span>
                <span className="text-violet">allocated load</span>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
