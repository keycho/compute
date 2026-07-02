"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion, useSpring } from "framer-motion";
import { useProtocol } from "@/lib/useProtocol";
import { getProtocol } from "@/lib/protocol";
import { fmtCompact, fmtLatency } from "@/lib/format";
import Sparkline from "@/components/ui/Sparkline";
import DepthChart from "@/components/ui/DepthChart";

/**
 * The hero instrument: a floating glass panel streaming live network
 * telemetry per provider class, with the capacity/load curve for
 * whichever class is armed. Pointer tilt gives it physical presence.
 */
export default function Telemetry() {
  const snap = useProtocol();
  const [selected, setSelected] = useState("H100");
  const reduced = useReducedMotion();

  const rx = useSpring(0, { stiffness: 60, damping: 14 });
  const ry = useSpring(0, { stiffness: 60, damping: 14 });
  const frame = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    if (reduced || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    rx.set(((e.clientY - r.top) / r.height - 0.5) * -4.5);
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 6);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  const curve = getProtocol().curve(selected, 16);
  const sel = snap.classes.find((c) => c.key === selected);

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
        <span className="col-heading">Network telemetry</span>
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse-dot" aria-hidden />
          mainnet · epoch 1,284
        </span>
      </div>

      {/* provider classes */}
      <div aria-label="Provider classes">
        <div
          aria-hidden
          className="grid grid-cols-[1.3fr_1fr_0.8fr_88px] items-center gap-2 px-5 pb-1 pt-3 font-mono text-[10.5px] uppercase tracking-[0.13em] text-mute"
        >
          <span>Class</span>
          <span className="text-right">Available</span>
          <span className="text-right">Routing</span>
          <span className="text-right">Load</span>
        </div>
        {snap.classes.map((c) => {
          const active = c.key === selected;
          return (
            <button
              key={c.key}
              aria-pressed={active}
              aria-label={`Show capacity curve for ${c.key}`}
              onClick={() => setSelected(c.key)}
              className={`grid w-full grid-cols-[1.3fr_1fr_0.8fr_88px] items-center gap-2 border-l-2 px-5 py-[9px] text-left transition-colors duration-150 ${
                active
                  ? "border-signal bg-[rgba(91,124,255,0.06)]"
                  : "border-transparent hover:bg-[rgba(235,240,255,0.03)]"
              }`}
            >
              <span className="flex flex-col">
                <span className="font-mono text-[13px] font-medium tracking-[0.02em] text-ink">
                  {c.key}
                </span>
                <span className="font-mono text-[10px] text-mute">
                  {(c.utilization * 100).toFixed(1)}% utilized
                </span>
              </span>
              <span
                key={`${c.key}-${c.available}`}
                className={`tnum text-right font-mono text-[13px] text-ink ${
                  c.dir < 0 ? "flash-pos" : c.dir > 0 ? "flash-neg" : ""
                }`}
              >
                {c.available.toLocaleString("en-US")}
              </span>
              <span className="tnum text-right font-mono text-[12px] text-dim">
                {fmtLatency(c.latency)}
              </span>
              <Sparkline
                data={c.history}
                up={c.dir <= 0}
                className="justify-self-end"
              />
            </button>
          );
        })}
      </div>

      {/* capacity / load curve */}
      <div className="border-t border-line px-5 pb-4 pt-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="col-heading">Capacity / load · {selected}</span>
          <span className="tnum font-mono text-[11px] text-mute">
            {sel ? `${sel.available.toLocaleString()} GPUs free` : ""}
          </span>
        </div>
        <DepthChart curve={curve} width={520} height={110} className="h-[96px] w-full" />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-mute">
          <span className="text-signal-bright">available</span>
          <span className="tnum">median {fmtLatency(curve.mid)}</span>
          <span className="text-violet">allocated</span>
        </div>
      </div>

      {/* protocol strip */}
      <div className="flex items-center justify-between border-t border-line px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
        <span>
          queue <span className="tnum text-ink">{fmtCompact(snap.queueDepth, "")}</span> jobs
        </span>
        <span>
          verified{" "}
          <span className="tnum text-signal-bright">{snap.verificationRate.toFixed(2)}%</span>
        </span>
      </div>
    </motion.div>
  );
}
