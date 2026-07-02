"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { AnimatePresence, motion } from "framer-motion";
import Dither from "@/components/gl/Dither";
import NetworkMesh from "@/components/gl/NetworkMesh";
import { Wordmark } from "@/components/ui/Logo";
import {
  itemDetail,
  itemStatusLabel,
  itemTitle,
  workerStatusText,
} from "@/components/ui/feedFormat";
import { fmtRangeMs, fmtTildeRange } from "@/lib/format";
import { createNetwork, stepNetwork } from "@/lib/network";
import { mulberry32 } from "@/lib/prng";
import { useFeed } from "@/lib/useFeed";
import type { EcoEvt, FeedItem, JobEntity, WorkerEntity } from "@/lib/feed";
import { getReceipt, type Receipt } from "@/lib/receipts";
import { bindPointer, viewState } from "@/lib/viewState";

/**
 * The network explorer: a live event stream over the living mesh.
 * Every feed row is inspectable in place — clicking one opens a
 * block drawer with the structured truth of that event. Execution
 * receipts from /execute and /create deep-link here via ?block=0x…,
 * so the explorer is part of every interaction, not a separate app.
 * Locally true, globally incomplete: entities are snapshots the system
 * happens to know about, not a database view.
 */

function ConsoleRig() {
  const { camera } = useThree();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const reduced = viewState.reducedMotion;
    const px = reduced ? 0 : viewState.pointerX;
    const py = reduced ? 0 : viewState.pointerY;
    const orbit = reduced ? 0 : Math.sin(t * 0.05) * 0.6;
    camera.position.x += (orbit + px * 1.1 - camera.position.x) * 0.03;
    camera.position.y += (py * 0.7 - camera.position.y) * 0.03;
    camera.position.z += (10.6 - camera.position.z) * 0.02;
    camera.lookAt(0, 0, -4);
  });
  return null;
}

/* ---------- selection model ---------- */

type Sel =
  | { id: string; title: string; t: "job"; j: JobEntity }
  | { id: string; title: string; t: "worker"; w: WorkerEntity }
  | { id: string; title: string; t: "eco"; e: EcoEvt }
  | { id: string; title: string; t: "receipt"; r: Receipt };

function selFromItem(i: FeedItem): Sel {
  if (i.kind === "economy")
    return { id: i.id, title: `EVENT #${i.block.toLocaleString("en-US")}`, t: "eco", e: i };
  if (i.kind === "job")
    return { id: i.id, title: `BLOCK #${i.block.toLocaleString("en-US")}`, t: "job", j: i.entity };
  return { id: i.id, title: `BLOCK #${i.block.toLocaleString("en-US")}`, t: "worker", w: i.entity };
}

/* ---------- explorer drawer renderers ---------- */

function Field({ k, v, cls }: { k: string; v: React.ReactNode; cls?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[5px]">
      <span className="font-mono text-[11px] text-mute">{k}</span>
      <span className={`text-right font-mono text-[12px] ${cls ?? "text-dim"}`}>{v}</span>
    </div>
  );
}

function BlockSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line px-5 py-4">
      <p className="col-heading mb-2 !text-[10.5px]">{title}</p>
      {children}
    </div>
  );
}

const PHASE_CLS: Record<string, string> = {
  executing: "text-signal-bright",
  rerouting: "text-violet",
  failed: "text-neg",
  completed: "text-pos",
  settled: "text-pos",
};

function JobBlock({ j, onPickNode }: { j: JobEntity; onPickNode: (node: string) => void }) {
  return (
    <>
      <BlockSection title="task">
        <Field k="type" v="job_execution" />
        <Field k="workload" v={`${j.type} / ${j.model}`} cls="text-ink" />
        <Field k="hash" v={j.hash} />
        <Field k="status" v={j.phase} cls={PHASE_CLS[j.phase] ?? "text-dim"} />
        <Field k="finalized" v={j.settlement === "settled" ? "true" : "false"} />
      </BlockSection>
      <BlockSection title="execution">
        <Field
          k="node"
          v={
            <button
              onClick={() => onPickNode(j.node)}
              className="font-semibold text-signal underline decoration-[rgba(255,255,255,0.45)] underline-offset-2 hover:decoration-white"
            >
              {j.node}
            </button>
          }
        />
        {j.previousNode && <Field k="previous node" v={j.previousNode} cls="text-mute" />}
        {j.rerouteReason && <Field k="reroute reason" v={j.rerouteReason} cls="text-violet" />}
        <Field k="gpu" v={j.gpu} />
        <Field k="latency" v={fmtRangeMs(j.latencyLo, j.latencyHi)} />
        <Field
          k="latency state"
          v={j.latencyState}
          cls={j.latencyState === "stable" ? "text-pos" : "text-violet"}
        />
        <Field k="retries" v={j.retries} cls={j.retries > 0 ? "text-violet" : undefined} />
        {(j.phase === "executing" || j.phase === "rerouting") && (
          <Field k="progress" v={`${Math.round(j.progress)}%`} cls="text-signal-bright" />
        )}
      </BlockSection>
      <BlockSection title="result">
        {(j.phase === "completed" || j.phase === "settled") && (
          <Field k="verified" v="output accepted" cls="text-pos" />
        )}
        {j.phase === "failed" && (
          <Field k="verified" v="rejected · retry scheduled" cls="text-neg" />
        )}
        {j.phase !== "completed" && j.phase !== "settled" && j.phase !== "failed" && (
          <Field k="verified" v="in flight" cls="text-mute" />
        )}
      </BlockSection>
      {j.reward !== undefined && (
        <BlockSection title="economics">
          <Field k="reward" v={`${j.reward.toFixed(2)} USDC`} cls="text-cyan" />
          <Field
            k="settlement"
            v={j.settlement === "settled" ? "epoch 1,284" : j.settlement}
            cls={j.settlement === "settled" ? "text-pos" : "text-mute"}
          />
        </BlockSection>
      )}
      <BlockSection title="trace">
        <p className="font-mono text-[11.5px] leading-[1.9] text-dim">
          {j.trace.map((t: string, i: number) => (
            <span key={i}>
              {i > 0 && <span className="text-mute"> → </span>}
              <span
                className={
                  t.startsWith("rerouted")
                    ? "text-violet"
                    : t === "paid"
                      ? "text-pos"
                      : t.startsWith("failed")
                        ? "text-neg"
                        : ""
                }
              >
                {t}
              </span>
            </span>
          ))}
        </p>
      </BlockSection>
    </>
  );
}

function WorkerBlock({
  w,
  jobs,
  onPickJob,
}: {
  w: WorkerEntity;
  jobs: JobEntity[];
  onPickJob: (j: JobEntity) => void;
}) {
  const st = workerStatusText(w);
  const recent = jobs.filter((j) => j.node === w.node || j.previousNode === w.node).slice(0, 4);
  return (
    <>
      <BlockSection title="node">
        <Field k="id" v={w.node} cls="text-ink" />
        <Field k="region" v={w.region} />
        <Field k="status" v={st.label} cls={st.cls} />
        <Field k="gpu" v={w.gpu} />
        {w.note && <Field k="note" v={w.note} cls="text-violet" />}
        {w.failMemory > 1.5 && (
          <Field k="failure memory" v="elevated · reroute odds up" cls="text-violet" />
        )}
      </BlockSection>
      <BlockSection title="load">
        <p className="font-mono text-[12px] text-dim">
          {w.loadHist[0]}% <span className="text-mute">→</span> {w.loadHist[1]}%{" "}
          <span className="text-mute">→</span> {w.loadHist[2]}%{" "}
          <span className="text-mute">(fluctuating)</span>
        </p>
        <div className="mt-2 h-[4px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ${
              w.status === "unstable" || w.status === "throttling" || w.status === "offline"
                ? "bg-neg/70"
                : "bg-signal/70"
            }`}
            style={{ width: `${w.loadHist[2]}%` }}
          />
        </div>
      </BlockSection>
      <BlockSection title="economics">
        <Field k="earnings (epoch)" v={`${w.earningsEpoch.toFixed(2)} USDC`} cls="text-cyan" />
      </BlockSection>
      <BlockSection title="recent jobs">
        {recent.length === 0 && (
          <p className="font-mono text-[11.5px] text-mute">nothing in the current window</p>
        )}
        {recent.map((j) => (
          <button
            key={j.id}
            onClick={() => onPickJob(j)}
            className="flex w-full items-baseline justify-between py-[5px] text-left hover:bg-[rgba(255,255,255,0.03)]"
          >
            <span className="font-mono text-[11.5px] text-signal">{j.hash}</span>
            <span className={`font-mono text-[11px] ${PHASE_CLS[j.phase] ?? "text-dim"}`}>
              {j.phase}
            </span>
          </button>
        ))}
      </BlockSection>
    </>
  );
}

function EcoBlock({ e }: { e: EcoEvt }) {
  return (
    <>
      <BlockSection title="event">
        <Field k="type" v={e.evt} cls={e.evt === "slash_event" ? "text-neg" : "text-cyan"} />
        {e.amount !== undefined && (
          <Field k="amount" v={`${e.amount.toLocaleString()} ${e.unit}`} cls="text-ink" />
        )}
        {e.note && <Field k="context" v={e.note} />}
        {e.node && <Field k="node" v={e.node} />}
        <Field k="state" v={e.state} cls={e.state === "finalized" ? "text-pos" : "text-mute"} />
        <Field k="scope" v={e.scope} cls="text-mute" />
      </BlockSection>
      <BlockSection title="context">
        <p className="font-mono text-[11.5px] leading-[1.8] text-mute">
          {e.evt === "slash_event"
            ? "invalid execution reduces trust: stake down, routing weight down. failure is part of system behavior."
            : e.evt === "stake_shift"
              ? "stake weight moved between routing pools. allocation follows trust; nothing was unlocked."
              : "burn is not scheduled. it happens when compute happens — a share of execution fees buys $Q0R and retires it."}
        </p>
      </BlockSection>
    </>
  );
}

function ReceiptBlock({ r }: { r: Receipt }) {
  return (
    <>
      <BlockSection title="task">
        <Field k="type" v="user_execution" />
        <Field
          k="workload"
          v={r.kind === "inference" ? `inference / ${r.model}` : `image_generation / ${r.model}`}
          cls="text-ink"
        />
        <Field k="hash" v={r.hash} cls="text-signal" />
        <Field k="status" v="completed" cls="text-pos" />
        <Field k="finalized" v="false" />
      </BlockSection>
      <BlockSection title="execution">
        <Field k="node" v={r.node} cls="text-ink" />
        <Field k="gpu" v={r.gpu} />
        <Field
          k="runtime"
          v={r.runtimeMs >= 1000 ? `${(r.runtimeMs / 1000).toFixed(1)}s` : `${Math.round(r.runtimeMs)}ms`}
        />
      </BlockSection>
      <BlockSection title="result">
        <Field k="verified" v="output accepted" cls="text-pos" />
        <Field k="delivered to" v="this client" cls="text-mute" />
      </BlockSection>
      <BlockSection title="economics">
        <Field k="cost" v={`${r.costUsdc.toFixed(4)} USDC`} cls="text-cyan" />
        <Field k="settlement" v="batched · next epoch close" cls="text-mute" />
      </BlockSection>
      <BlockSection title="prompt">
        <p className="font-mono text-[11.5px] leading-[1.8] text-dim">
          {r.prompt.length > 180 ? `${r.prompt.slice(0, 180)}…` : r.prompt}
        </p>
      </BlockSection>
    </>
  );
}

/* ---------- explorer ---------- */

export default function Explorer() {
  const network = useMemo(() => {
    const net = createNetwork(72, "console-mesh");
    const warm = mulberry32(0xfa57);
    for (let i = 0; i < 240; i++) stepNetwork(net, 0.1, warm);
    return net;
  }, []);
  const meshProgress = useRef({ opacity: 1, form: 1 });
  const snap = useFeed();
  const [selected, setSelected] = useState<Sel | null>(null);
  const [meshSelected, setMeshSelected] = useState(-1);

  useEffect(() => bindPointer(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setMeshSelected(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // "view block" on any execution receipt lands here with ?block=0x…
  useEffect(() => {
    const hash = new URLSearchParams(window.location.search).get("block");
    if (!hash) return;
    const r = getReceipt(hash);
    if (r) setSelected({ id: `rc-${r.hash}`, title: `JOB ${r.hash}`, t: "receipt", r });
  }, []);

  // distinct job entities currently visible in the event window
  const jobs = useMemo(() => {
    const seen = new Set<string>();
    const out: JobEntity[] = [];
    for (const i of snap.items) {
      if (i.kind === "job" && !seen.has(i.entity.id)) {
        seen.add(i.entity.id);
        out.push(i.entity);
      }
    }
    return out;
  }, [snap.items]);

  const pickNodeByName = (name: string) => {
    const w = snap.workers.find((w) => w.node === name);
    if (w) setSelected({ id: `wn-${name}`, title: `NODE ${name}`, t: "worker", w });
  };

  const pickMeshNode = (idx: number) => {
    setMeshSelected(idx);
    const n = network.nodes[idx];
    const load = Math.round(n.utilization * 100);
    const w: WorkerEntity = {
      node: n.id,
      region: n.region,
      gpu: n.gpuClass,
      status: n.reliability > 0.975 ? "online" : n.utilization > 0.9 ? "throttling" : "unstable",
      loadHist: [Math.max(8, load - 9), Math.min(98, load + 5), load],
      stressed: n.reliability <= 0.975,
      note: n.reliability <= 0.975 ? "reliability degraded" : undefined,
      earningsEpoch: n.earnings,
      failMemory: n.reliability <= 0.97 ? 2 : 0,
      recent: [],
    };
    setSelected({ id: `mesh-${n.id}`, title: `NODE ${n.id}`, t: "worker", w });
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg">
      {/* the system */}
      <Canvas
        camera={{ fov: 46, near: 0.1, far: 60, position: [0, 0, 10.6] }}
        // low-res + nearest-neighbor upscale (.pixelated): abstract pixel
        // mesh behind the crisp DOM panels; picking is unaffected
        dpr={0.42}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor("#060606");
          scene.fog = new THREE.Fog("#060606", 8, 26);
        }}
        onPointerMissed={() => {
          setSelected(null);
          setMeshSelected(-1);
        }}
        className="pixelated absolute inset-0"
      >
        <ConsoleRig />
        <NetworkMesh
          progressRef={meshProgress}
          network={network}
          scale={7}
          position={[1.2, 0.1, -4]}
          rotationSpeed={0.014}
          onPick={pickMeshNode}
          selected={meshSelected}
          accent
        />
        <EffectComposer>
          {/* no bloom — same rule as the landing scene: vignette shapes
              the light, dither quantizes every gradient into pattern.
              the dither preserves hue, so the green accent survives. */}
          <Vignette darkness={0.78} offset={0.24} />
          <Dither levels={5} />
        </EffectComposer>
      </Canvas>

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
        <div className="glass reticle pointer-events-auto flex items-center gap-5 px-5 py-3">
          <Link href="/" aria-label="Back to overview">
            <Wordmark />
          </Link>
          <span className="hidden h-4 w-px bg-line md:block" aria-hidden />
          <span className="chip hidden md:inline">NETWORK EXPLORER</span>
        </div>
        <div className="glass reticle pointer-events-auto flex items-center gap-5 px-5 py-3.5">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#4ade80]" aria-hidden />
            mainnet
          </span>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-mute md:inline">
            epoch <span className="tnum text-ink">{snap.epoch.toLocaleString()}</span>
          </span>
          <Link
            href="/"
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-signal underline decoration-[rgba(255,255,255,0.45)] underline-offset-4 transition-colors hover:decoration-white"
          >
            ← overview
          </Link>
        </div>
      </div>

      {/* live feed — primary UI */}
      <div className="absolute max-md:inset-x-3 max-md:bottom-3 max-md:h-[42vh] md:bottom-6 md:left-6 md:top-24 md:w-[390px]">
        <div className="glass reticle flex h-full flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="col-heading">live feed</span>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
              in flight {fmtTildeRange(snap.approx.jobsInFlightLo, snap.approx.jobsInFlightHi)}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-1.5 py-1.5">
            <AnimatePresence initial={false}>
              {snap.items.map((i) => {
                const s = itemStatusLabel(i);
                const active = selected?.id === i.id;
                const dot =
                  i.kind === "job"
                    ? "bg-[#4ade80]"
                    : i.kind === "worker"
                      ? "bg-[rgba(255,255,255,0.85)]"
                      : "bg-[#86efac]";
                return (
                  <motion.button
                    key={i.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.7, 0, 0.3, 1] }}
                    onClick={() => {
                      setSelected(selFromItem(i));
                      setMeshSelected(-1);
                    }}
                    aria-pressed={active}
                    className={`grid w-full grid-cols-[8px_1fr_auto] items-baseline gap-x-2.5 rounded-[6px] px-2.5 py-[6px] text-left transition-colors duration-150 ${
                      active ? "bg-[rgba(255,255,255,0.08)]" : "hover:bg-[rgba(255,255,255,0.03)]"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 self-center rounded-full ${dot}`} aria-hidden />
                    <span className="truncate font-mono text-[12px] text-ink">{itemTitle(i)}</span>
                    <span className={`font-mono text-[10.5px] ${s.cls}`}>{s.label}</span>
                    <span aria-hidden />
                    <span className="col-span-2 truncate font-mono text-[10.5px] text-mute">
                      {itemDetail(i)}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
            <span>providers {snap.approx.providersMasked}</span>
            <span>latency {fmtRangeMs(snap.approx.latencyLo, snap.approx.latencyHi)} · varies</span>
          </div>
        </div>
      </div>

      {/* network state (approx) — quiet corner panel, yields to the drawer */}
      <div
        className={`glass pointer-events-none absolute bottom-6 right-6 hidden w-[240px] flex-col gap-1.5 p-4 transition-opacity duration-300 lg:flex ${selected ? "opacity-0" : "opacity-100"}`}
      >
        <span className="col-heading mb-1">network state</span>
        <p className="flex justify-between font-mono text-[11px]">
          <span className="text-mute">providers</span>
          <span className="tnum text-dim">
            {snap.approx.providersMasked}{" "}
            <span className="text-mute">({snap.approx.providersNote})</span>
          </span>
        </p>
        <p className="flex justify-between font-mono text-[11px]">
          <span className="text-mute">jobs in flight</span>
          <span className="tnum text-dim">
            {fmtTildeRange(snap.approx.jobsInFlightLo, snap.approx.jobsInFlightHi)}
          </span>
        </p>
        <p className="flex justify-between font-mono text-[11px]">
          <span className="text-mute">latency</span>
          <span className="tnum text-dim">
            {fmtRangeMs(snap.approx.latencyLo, snap.approx.latencyHi)}
          </span>
        </p>
        <p className="flex justify-between font-mono text-[11px]">
          <span className="text-mute">execution density</span>
          <span className="text-dim">{snap.approx.executionDensity}</span>
        </p>
        <p className="flex justify-between font-mono text-[11px]">
          <span className="text-mute">queue pressure</span>
          <span className="text-dim">{snap.approx.queuePressure}</span>
        </p>
        <p className="flex justify-between font-mono text-[11px]">
          <span className="text-mute">failover</span>
          <span className="text-dim">occasional</span>
        </p>
      </div>

      {/* explorer drawer */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            key={selected.id}
            initial={{ x: "105%" }}
            animate={{ x: 0 }}
            exit={{ x: "105%" }}
            transition={{ duration: 0.45, ease: [0.7, 0, 0.3, 1] }}
            role="dialog"
            aria-label={selected.title}
            className="absolute z-10 max-md:inset-x-3 max-md:bottom-3 max-md:top-[22vh] md:bottom-6 md:right-6 md:top-24 md:w-[420px]"
          >
            <div className="glass reticle flex h-full flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <span className="font-mono text-[13px] font-medium tracking-[0.04em] text-ink">
                  {selected.title}
                </span>
                <button
                  onClick={() => {
                    setSelected(null);
                    setMeshSelected(-1);
                  }}
                  className="font-mono text-[14px] text-mute hover:text-ink"
                  aria-label="Close explorer"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pb-2">
                {selected.t === "job" && <JobBlock j={selected.j} onPickNode={pickNodeByName} />}
                {selected.t === "worker" && (
                  <WorkerBlock
                    w={selected.w}
                    jobs={jobs}
                    onPickJob={(j) =>
                      setSelected({ id: `je-${j.id}`, title: `JOB ${j.hash}`, t: "job", j })
                    }
                  />
                )}
                {selected.t === "eco" && <EcoBlock e={selected.e} />}
                {selected.t === "receipt" && <ReceiptBlock r={selected.r} />}
              </div>
              <div className="border-t border-line px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                snapshot · locally true, globally incomplete
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
