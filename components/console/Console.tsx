"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { AnimatePresence, motion } from "framer-motion";
import NetworkMesh from "@/components/gl/NetworkMesh";
import CountUp from "@/components/ui/CountUp";
import { Wordmark } from "@/components/ui/Logo";
import { fmtCompact } from "@/lib/format";
import { createNetwork, stepNetwork, type NetworkState } from "@/lib/network";
import { mulberry32 } from "@/lib/prng";
import { bindPointer, viewState } from "@/lib/viewState";

/**
 * The network console: the operational view of the mesh. Providers are
 * luminous nodes, jobs are packets in flight, earnings arrive as light.
 * The DOM is a thin glass HUD around a living system — no tables, no
 * forms, just the network and its instruments.
 */

const KIND_LABEL: Record<string, string> = {
  inference: "inference",
  training: "training",
  settlement: "settlement",
};
const KIND_DOT: Record<string, string> = {
  inference: "bg-signal",
  training: "bg-violet",
  settlement: "bg-cyan",
};

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

function Panel({
  className,
  children,
  delay = 0,
}: {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, delay, ease: [0.7, 0, 0.3, 1] }}
      className={`glass reticle pointer-events-auto ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

/** poll the mutable sim into React at a readable cadence */
function useSimReadout(state: NetworkState) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((v) => v + 1), 400);
    return () => clearInterval(t);
  }, []);
  return state;
}

export default function Console() {
  const network = useMemo(() => {
    const net = createNetwork(72, "console-mesh");
    // fast-forward so the console opens onto a system already in motion
    const warm = mulberry32(0xfa57);
    for (let i = 0; i < 240; i++) stepNetwork(net, 0.1, warm);
    return net;
  }, []);
  const sim = useSimReadout(network);
  const [selected, setSelected] = useState<number>(-1);
  const meshProgress = useRef({ opacity: 1, form: 1 });

  useEffect(() => bindPointer(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const inspectorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected >= 0) inspectorRef.current?.focus();
  }, [selected]);

  // jobs/min over a sliding window
  const rate = useRef<{ t: number; jobs: number }[]>([]);
  rate.current.push({ t: sim.time, jobs: sim.totalJobs });
  if (rate.current.length > 40) rate.current.shift();
  const windowStart = rate.current[0];
  const jobsPerMin =
    sim.time - windowStart.t > 1
      ? ((sim.totalJobs - windowStart.jobs) / (sim.time - windowStart.t)) * 60
      : 0;

  // plain per-render computation: sim.events is mutated in place, so a
  // useMemo keyed on it would never recompute (24 items, memo buys nothing)
  const counts = { inference: 0, training: 0, settlement: 0 };
  for (const e of sim.events) counts[e.kind]++;
  const evTotal = Math.max(1, sim.events.length);
  const kindCounts = {
    inference: counts.inference / evTotal,
    training: counts.training / evTotal,
    settlement: counts.settlement / evTotal,
  };

  const node = selected >= 0 ? sim.nodes[selected] : null;

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
        className="absolute inset-0"
      >
        <ConsoleRig />
        <NetworkMesh
          progressRef={meshProgress}
          network={network}
          scale={7}
          position={[0, 0, -4]}
          rotationSpeed={0.014}
          onPick={setSelected}
          selected={selected}
        />
        <EffectComposer>
          <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.16} luminanceSmoothing={0.3} radius={0.85} />
          <Vignette darkness={0.78} offset={0.24} />
        </EffectComposer>
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 md:p-6">
        {/* top bar */}
        <div className="flex items-start justify-between gap-4">
          <Panel className="flex items-center gap-5 px-5 py-3">
            <Link href="/" className="pointer-events-auto" aria-label="Back to overview">
              <Wordmark />
            </Link>
            <span className="hidden h-4 w-px bg-line md:block" aria-hidden />
            <span className="chip hidden md:inline">NETWORK CONSOLE</span>
          </Panel>
          <Panel delay={0.08} className="flex items-center gap-5 px-5 py-3.5">
            <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pos" aria-hidden />
              mainnet
            </span>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-mute md:inline">
              epoch <span className="tnum text-ink">1,284</span>
            </span>
            <Link
              href="/"
              className="pointer-events-auto font-mono text-[11px] uppercase tracking-[0.12em] text-signal transition-colors hover:text-signal-bright"
            >
              ← overview
            </Link>
          </Panel>
        </div>

        {/* middle row: left stats + right inspector */}
        <div className="flex items-center justify-between gap-4">
          <Panel delay={0.16} className="hidden w-[240px] flex-col gap-5 p-5 md:flex">
            <span className="col-heading">Network</span>
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                Active GPUs
              </p>
              <CountUp
                value={sim.activeGpus}
                format={(v) => Math.round(v).toLocaleString("en-US")}
                className="font-display text-[26px] font-semibold text-ink"
              />
            </div>
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                Providers online
              </p>
              <p className="tnum font-display text-[26px] font-semibold text-ink">
                {sim.nodes.length}
              </p>
            </div>
            <div>
              <label
                htmlFor="node-select"
                className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint"
              >
                Inspect node
              </label>
              <select
                id="node-select"
                value={selected}
                onChange={(e) => setSelected(Number(e.target.value))}
                className="mt-1.5 w-full rounded-[6px] border border-line bg-[rgba(10,12,18,0.8)] px-2.5 py-2 font-mono text-[11.5px] text-dim outline-none focus:border-[rgba(91,124,255,0.55)]"
              >
                <option value={-1}>— pick from mesh —</option>
                {sim.nodes.map((n, i) => (
                  <option key={n.id} value={i}>
                    {n.id} · {n.region} · {n.gpuClass}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                Settled this epoch
              </p>
              <CountUp
                value={sim.settledUsd}
                format={(v) => fmtCompact(v)}
                className="font-display text-[26px] font-semibold text-signal-bright"
              />
            </div>
          </Panel>

          <AnimatePresence>
            {node && (
              <motion.div
                key={selected}
                ref={inspectorRef}
                tabIndex={-1}
                role="dialog"
                aria-label={`Node ${node.id}`}
                initial={{ opacity: 0, x: 24, filter: "blur(8px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 24, filter: "blur(6px)" }}
                transition={{ duration: 0.5, ease: [0.7, 0, 0.3, 1] }}
                className="glass reticle pointer-events-auto w-[280px] p-5 outline-none"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="col-heading">Node {node.id}</span>
                  <button
                    onClick={() => setSelected(-1)}
                    className="font-mono text-[13px] text-mute hover:text-ink"
                    aria-label="Close inspector"
                  >
                    ×
                  </button>
                </div>
                <div className="flex flex-col gap-3 font-mono text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-faint">region</span>
                    <span className="text-dim">{node.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-faint">class</span>
                    <span className="text-dim">{node.gpuClass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-faint">capacity</span>
                    <span className="tnum text-dim">{node.capacity.toLocaleString()} GPUs</span>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-faint">utilization</span>
                      <span className="tnum text-ink">{(node.utilization * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-full bg-[rgba(235,240,255,0.07)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-signal to-violet transition-[width] duration-500"
                        style={{ width: `${node.utilization * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-faint">reliability</span>
                    <span className="tnum text-pos">{(node.reliability * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-faint">stake</span>
                    <span className="tnum text-dim">{fmtCompact(node.stake, "")} Q0R</span>
                  </div>
                  <div className="flex justify-between border-t border-line pt-3">
                    <span className="text-faint">session rewards</span>
                    <CountUp
                      value={node.earnings}
                      format={(v) => `${v.toFixed(2)} USDC`}
                      className="text-cyan"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* bottom row */}
        <div className="flex items-end justify-between gap-4">
          <Panel delay={0.24} className="w-full max-w-[430px] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="col-heading">Job stream</span>
              <span className="tnum font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
                {jobsPerMin.toFixed(0)} jobs/min
              </span>
            </div>
            <ul className="flex flex-col gap-1.5 font-mono text-[11px]">
              <AnimatePresence initial={false}>
                {sim.events.slice(0, 6).map((e) => (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.7, 0, 0.3, 1] }}
                    className="flex items-center gap-2.5"
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${KIND_DOT[e.kind]}`} aria-hidden />
                    <span className="tnum text-faint">
                      0x{(e.id * 2654435761 % 0xffffff).toString(16).padStart(6, "0")}
                    </span>
                    <span className="text-mute">→ {e.nodeId}</span>
                    <span className="text-dim">{KIND_LABEL[e.kind]}</span>
                    <span className="tnum ml-auto text-mute">{e.tflopHours.toFixed(1)} TFLOP·h</span>
                    <span className="tnum text-signal-bright">${e.paidUsd.toFixed(2)}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </Panel>

          <Panel delay={0.3} className="hidden w-[260px] flex-col gap-4 p-5 lg:flex">
            <span className="col-heading">Flows</span>
            {(["inference", "training", "settlement"] as const).map((k) => (
              <div key={k}>
                <div className="mb-1.5 flex justify-between font-mono text-[10.5px] uppercase tracking-[0.1em]">
                  <span className="flex items-center gap-2 text-faint">
                    <span className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[k]}`} aria-hidden />
                    {k}
                  </span>
                  <span className="tnum text-dim">{Math.round(kindCounts[k] * 100)}%</span>
                </div>
                <div className="h-[4px] overflow-hidden rounded-full bg-[rgba(235,240,255,0.07)]">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ${
                      k === "inference" ? "bg-signal" : k === "training" ? "bg-violet" : "bg-cyan"
                    }`}
                    style={{ width: `${kindCounts[k] * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="border-t border-line pt-3 font-mono text-[10px] leading-[1.6] text-faint">
              Compute is routed across the mesh by latency, stake, and demand.
              Select a node to inspect it.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
