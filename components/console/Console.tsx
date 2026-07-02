"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { AnimatePresence, motion } from "framer-motion";
import NetworkMesh from "@/components/gl/NetworkMesh";
import { Wordmark } from "@/components/ui/Logo";
import { itemDetail, itemStatusLabel, itemTitle } from "@/components/ui/feedFormat";
import { fmtRangeMs, fmtTilde } from "@/lib/format";
import { createNetwork, stepNetwork } from "@/lib/network";
import { mulberry32 } from "@/lib/prng";
import { useFeed } from "@/lib/useFeed";
import type { FeedItem, JobItem, TokenItem, WorkerItem } from "@/lib/feed";
import { bindPointer, viewState } from "@/lib/viewState";

/**
 * The network console: a live event stream over the living mesh.
 * Every feed row is inspectable in place — clicking one opens a
 * block-explorer drawer with the structured truth of that event.
 * No separate pages, no analytics chrome. A system, in motion.
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

function JobBlock({ j, onPick }: { j: JobItem; onPick: (hash: string) => void }) {
  const s = itemStatusLabel(j);
  return (
    <>
      <BlockSection title="task">
        <Field k="type" v="job_execution" />
        <Field k="workload" v={`${j.type} / ${j.model}`} cls="text-ink" />
        <Field k="hash" v={j.hash} />
        <Field k="status" v={j.status} cls={s.cls} />
        <Field k="finalized" v={j.finalized ? "true" : "false"} />
      </BlockSection>
      <BlockSection title="execution">
        <Field
          k="node"
          v={
            <button onClick={() => onPick(j.node)} className="text-signal hover:text-signal-bright">
              {j.node}
            </button>
          }
        />
        {j.previousNode && <Field k="previous node" v={j.previousNode} cls="text-mute" />}
        {j.rerouteReason && <Field k="reroute reason" v={j.rerouteReason} cls="text-violet" />}
        <Field k="gpu" v={j.gpu} />
        <Field k="latency" v={fmtRangeMs(j.latencyLo, j.latencyHi)} />
        <Field k="observed" v={`${Math.round(j.latencyNow)}ms`} />
        <Field k="retries" v={j.retries} cls={j.retries > 0 ? "text-violet" : undefined} />
        {j.status === "running" && (
          <Field k="progress" v={`${Math.round(j.progress)}%`} cls="text-signal-bright" />
        )}
      </BlockSection>
      <BlockSection title="result">
        {j.status === "completed" && (
          <>
            <Field k="verified" v="output accepted" cls="text-pos" />
          </>
        )}
        {j.status === "pending finalization" && (
          <Field k="verified" v="awaiting settlement" cls="text-mute" />
        )}
        {j.status === "failed" && <Field k="verified" v="rejected · retry scheduled" cls="text-neg" />}
        {(j.status === "running" || j.status === "rerouted") && (
          <Field k="verified" v="in flight" cls="text-mute" />
        )}
      </BlockSection>
      {j.reward !== undefined && (
        <BlockSection title="economics">
          <Field k="reward" v={`${j.reward.toFixed(2)} USDC`} cls="text-cyan" />
          <Field k="settled" v={j.finalized ? `epoch 1,284` : "pending"} />
        </BlockSection>
      )}
      <BlockSection title="trace">
        <p className="font-mono text-[11.5px] leading-[1.9] text-dim">
          {j.trace.map((t, i) => (
            <span key={i}>
              {i > 0 && <span className="text-mute"> → </span>}
              <span className={t.startsWith("rerouted") ? "text-violet" : t === "paid" ? "text-pos" : ""}>
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
  w: WorkerItem;
  jobs: JobItem[];
  onPickJob: (j: JobItem) => void;
}) {
  const recent = jobs.filter((j) => j.node === w.node).slice(0, 4);
  return (
    <>
      <BlockSection title="node">
        <Field k="id" v={w.node} cls="text-ink" />
        <Field k="region" v={w.region} />
        <Field
          k="status"
          v={w.status === "recovered" ? "online" : w.status}
          cls={w.status === "unstable" ? "text-neg" : "text-pos"}
        />
        <Field k="gpu" v={w.gpu} />
        {w.note && <Field k="note" v={w.note} cls="text-violet" />}
      </BlockSection>
      <BlockSection title="load">
        <p className="font-mono text-[12px] text-dim">
          {Math.round(w.loadLo)}% <span className="text-mute">→</span> {Math.round(w.loadNow)}%{" "}
          <span className="text-mute">→</span> {Math.round(w.loadHi)}%{" "}
          <span className="text-mute">(fluctuating)</span>
        </p>
        <div className="mt-2 h-[4px] overflow-hidden rounded-full bg-[rgba(235,240,255,0.06)]">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 ${w.status === "unstable" ? "bg-neg/70" : "bg-signal/70"}`}
            style={{ width: `${w.loadNow}%` }}
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
        {recent.map((j) => {
          const s = itemStatusLabel(j);
          return (
            <button
              key={j.id}
              onClick={() => onPickJob(j)}
              className="flex w-full items-baseline justify-between py-[5px] text-left hover:bg-[rgba(235,240,255,0.03)]"
            >
              <span className="font-mono text-[11.5px] text-signal">{j.hash}</span>
              <span className={`font-mono text-[11px] ${s.cls}`}>{j.status}</span>
            </button>
          );
        })}
      </BlockSection>
    </>
  );
}

function TokenBlock({ t }: { t: TokenItem }) {
  return (
    <>
      <BlockSection title="event">
        <Field k="type" v={t.type} cls={t.type === "slash" ? "text-neg" : "text-cyan"} />
        <Field k="amount" v={`${t.amount.toLocaleString()} ${t.unit}`} cls="text-ink" />
        <Field k="source" v={t.source} />
        {t.node && <Field k="node" v={t.node} />}
        <Field k="state" v={t.state} cls={t.state === "pending" ? "text-mute" : "text-pos"} />
      </BlockSection>
      <BlockSection title="context">
        <p className="font-mono text-[11.5px] leading-[1.8] text-mute">
          {t.type === "slash"
            ? "invalid execution reduces trust: stake down, routing weight down. failure is part of system behavior."
            : "burn is not scheduled. it happens when compute happens — a share of execution fees buys $Q0R and retires it."}
        </p>
      </BlockSection>
    </>
  );
}

/* ---------- console ---------- */

export default function Console() {
  const network = useMemo(() => {
    const net = createNetwork(72, "console-mesh");
    const warm = mulberry32(0xfa57);
    for (let i = 0; i < 240; i++) stepNetwork(net, 0.1, warm);
    return net;
  }, []);
  const meshProgress = useRef({ opacity: 1, form: 1 });
  const snap = useFeed();
  const [selected, setSelected] = useState<FeedItem | null>(null);
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

  const jobs = snap.items.filter((i): i is JobItem => i.kind === "job");

  const pickNodeByName = (name: string) => {
    const w = snap.workers.find((w) => w.node === name);
    if (w) setSelected(w);
  };

  const pickMeshNode = (idx: number) => {
    setMeshSelected(idx);
    const n = network.nodes[idx];
    // present the mesh node as a worker block
    const w: WorkerItem = {
      kind: "worker",
      id: `mesh-${n.id}`,
      block: 918_000 + idx,
      node: n.id,
      region: n.region,
      gpu: `${n.gpuClass}`,
      status: n.reliability > 0.975 ? "online" : "unstable",
      loadLo: Math.max(10, Math.round(n.utilization * 100) - 14),
      loadHi: Math.min(99, Math.round(n.utilization * 100) + 12),
      loadNow: Math.round(n.utilization * 100),
      note: n.reliability <= 0.975 ? "reliability degraded" : undefined,
      earningsEpoch: n.earnings,
      recent: [],
      updatedTick: snap.tick,
    };
    setSelected(w);
  };

  const drawerTitle = selected
    ? selected.kind === "token"
      ? `EVENT #${selected.block.toLocaleString("en-US")}`
      : `BLOCK #${selected.block.toLocaleString("en-US")}`
    : "";

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg">
      {/* the system */}
      <Canvas
        camera={{ fov: 46, near: 0.1, far: 60, position: [0, 0, 10.6] }}
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor("#030304");
          scene.fog = new THREE.Fog("#030304", 8, 26);
        }}
        onPointerMissed={() => {
          setSelected(null);
          setMeshSelected(-1);
        }}
        className="absolute inset-0"
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
        />
        <EffectComposer>
          <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.16} luminanceSmoothing={0.3} radius={0.85} />
          <Vignette darkness={0.78} offset={0.24} />
        </EffectComposer>
      </Canvas>

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
        <div className="glass reticle pointer-events-auto flex items-center gap-5 px-5 py-3">
          <Link href="/" aria-label="Back to overview">
            <Wordmark />
          </Link>
          <span className="hidden h-4 w-px bg-line md:block" aria-hidden />
          <span className="chip hidden md:inline">NETWORK CONSOLE</span>
        </div>
        <div className="glass reticle pointer-events-auto flex items-center gap-5 px-5 py-3.5">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pos" aria-hidden />
            mainnet
          </span>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-mute md:inline">
            epoch <span className="tnum text-ink">{snap.epoch.toLocaleString()}</span>
          </span>
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-signal transition-colors hover:text-signal-bright"
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
            in flight {fmtTilde(snap.approx.jobsInFlight)}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-1.5 py-1.5">
          <AnimatePresence initial={false}>
            {snap.items.map((i) => {
              const s = itemStatusLabel(i);
              const active = selected?.id === i.id;
              const dot =
                i.kind === "job" ? "bg-signal" : i.kind === "worker" ? "bg-violet" : "bg-cyan";
              return (
                <motion.button
                  key={i.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.7, 0, 0.3, 1] }}
                  onClick={() => {
                    setSelected(i);
                    setMeshSelected(-1);
                  }}
                  aria-pressed={active}
                  className={`grid w-full grid-cols-[8px_1fr_auto] items-baseline gap-x-2.5 rounded-[6px] px-2.5 py-[6px] text-left transition-colors duration-150 ${
                    active ? "bg-[rgba(91,124,255,0.08)]" : "hover:bg-[rgba(235,240,255,0.03)]"
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
          <span>
            latency {fmtRangeMs(snap.approx.latencyLo, snap.approx.latencyHi)} · varies
          </span>
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
          <span className="tnum text-dim">{snap.approx.providersMasked}</span>
        </p>
        <p className="flex justify-between font-mono text-[11px]">
          <span className="text-mute">jobs in flight</span>
          <span className="tnum text-dim">{fmtTilde(snap.approx.jobsInFlight)}</span>
        </p>
        <p className="flex justify-between font-mono text-[11px]">
          <span className="text-mute">median latency</span>
          <span className="tnum text-dim">
            {fmtRangeMs(snap.approx.latencyLo, snap.approx.latencyHi)}
          </span>
        </p>
        <p className="flex justify-between font-mono text-[11px]">
          <span className="text-mute">failover</span>
          <span className="text-dim">occasional</span>
        </p>
        <p className="flex justify-between font-mono text-[11px]">
          <span className="text-mute">settlement</span>
          <span className="text-dim">epoch-based</span>
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
            aria-label={drawerTitle}
            className="absolute z-10 max-md:inset-x-3 max-md:bottom-3 max-md:top-[22vh] md:bottom-6 md:right-6 md:top-24 md:w-[420px]"
          >
          <div className="glass reticle flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <span className="font-mono text-[13px] font-medium tracking-[0.04em] text-ink">
                {drawerTitle}
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
              {selected.kind === "job" && <JobBlock j={selected} onPick={pickNodeByName} />}
              {selected.kind === "worker" && (
                <WorkerBlock w={selected} jobs={jobs} onPickJob={(j) => setSelected(j)} />
              )}
              {selected.kind === "token" && <TokenBlock t={selected} />}
            </div>
            <div className="border-t border-line px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
              snapshot · updates live in feed
            </div>
          </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
