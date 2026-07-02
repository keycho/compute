"use client";

import { useFeed } from "@/lib/useFeed";
import { fmtRangeMs, fmtTildeRange } from "@/lib/format";
import Reveal from "@/components/ui/Reveal";
import { workerStatusText } from "@/components/ui/feedFormat";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Network state, kept deliberately approximate. The mesh reports what
 * it sees; these are streaming reads, not audited totals. The worker
 * feed shows real nodes with real problems — load swings, throttling,
 * recoveries — because that is what a live network looks like.
 */

function StateRow({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-4 first:border-t">
      <span className="font-mono text-[13px] text-mute">{label}</span>
      <span className="text-right">
        <span className="tnum font-mono text-[15px] text-ink">{value}</span>
        {note && <span className="ml-2 font-mono text-[11px] text-mute">{note}</span>}
      </span>
    </div>
  );
}

export default function NetworkState() {
  const snap = useFeed();
  const workers = snap.workers.slice(0, 6);

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
              What the mesh
              <br />
              sees right now<span className="text-signal">.</span>
            </>
          }
          body="Streaming reads from the network, not audited totals. Numbers drift, nodes flap, jobs reroute — that is the system working, not a fault in the chart."
        />

        <div className="container-x mt-16 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          {/* approximate state */}
          <Reveal>
            <div className="glass reticle p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="col-heading">network state</span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                  approx · streaming
                </span>
              </div>
              <StateRow
                label="active providers"
                value={snap.approx.providersMasked}
                note={snap.approx.providersNote}
              />
              <StateRow
                label="jobs in flight"
                value={fmtTildeRange(snap.approx.jobsInFlightLo, snap.approx.jobsInFlightHi)}
              />
              <StateRow
                label="latency"
                value={fmtRangeMs(snap.approx.latencyLo, snap.approx.latencyHi)}
                note="varies"
              />
              <StateRow label="execution density" value={snap.approx.executionDensity} />
              <StateRow label="queue pressure" value={snap.approx.queuePressure} />
              <StateRow label="failover events" value="occasional" note="rerouted in-flight" />
              <StateRow label="settlement" value="epoch-based" note={`epoch ${snap.epoch.toLocaleString()}`} />
              <p className="mt-5 font-mono text-[11.5px] leading-[1.7] text-mute">
                Global inventory is not tracked centrally. Any number above is
                what the routing layer can currently see, and it changes while
                you read it.
              </p>
            </div>
          </Reveal>

          {/* live worker feed */}
          <Reveal delay={0.1}>
            <div className="mb-4 flex items-center justify-between">
              <span className="col-heading">live worker feed</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                {workers.length} of many · rotating sample
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {workers.map((w) => {
                const st = workerStatusText(w);
                const bad =
                  w.status === "unstable" || w.status === "throttling" || w.status === "offline";
                return (
                  <div key={w.node} className="glass p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-[13px] font-medium text-ink">{w.node}</span>
                      <span
                        className={`font-mono text-[10.5px] uppercase tracking-[0.1em] ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-mute">
                      {w.region} · gpu: {w.gpu}
                    </p>
                    <div className="mt-3 flex items-baseline justify-between font-mono text-[11px]">
                      <span className="text-mute">
                        load {w.loadHist[0]}% → {w.loadHist[1]}% → {w.loadHist[2]}%{" "}
                        <span className="text-mute/70">(fluctuating)</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-[rgba(235,240,255,0.06)]">
                      <div
                        className={`h-full rounded-full transition-[width] duration-1000 ${
                          bad ? "bg-neg/70" : "bg-signal/70"
                        }`}
                        style={{ width: `${w.loadHist[2]}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-baseline justify-between font-mono text-[11px]">
                      <span className="text-mute">
                        {w.note ? `note: ${w.note}` : "earnings (epoch)"}
                      </span>
                      <span className="tnum text-cyan">${w.earningsEpoch.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
