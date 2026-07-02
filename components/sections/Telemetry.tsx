"use client";

import Link from "next/link";
import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion, useSpring } from "framer-motion";
import { useFeed } from "@/lib/useFeed";
import { fmtRangeMs, fmtTilde } from "@/lib/format";
import { itemDetail, itemStatusLabel, itemTitle } from "@/components/ui/feedFormat";

/**
 * The hero instrument: the live job stream, straight from the mesh.
 * Rows arrive on top, update in place, reroute, fail, settle. Clicking
 * through lands in the console where every row can be inspected.
 */
export default function Telemetry() {
  const snap = useFeed();
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

  const rows = snap.items.slice(0, 9);

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
        <span className="col-heading">Live job stream</span>
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
          <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse-dot" aria-hidden />
          mainnet · epoch {snap.epoch.toLocaleString("en-US")}
        </span>
      </div>

      {/* stream */}
      <div className="max-h-[430px] overflow-hidden px-2 py-2" aria-label="Live job stream">
        <AnimatePresence initial={false}>
          {rows.map((i) => {
            const s = itemStatusLabel(i);
            return (
              <motion.div
                key={i.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.7, 0, 0.3, 1] }}
              >
                <Link
                  href="/app"
                  className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 rounded-[6px] px-3 py-[7px] transition-colors duration-150 hover:bg-[rgba(235,240,255,0.03)]"
                >
                  <span className="truncate font-mono text-[12.5px] text-ink">
                    {itemTitle(i)}
                  </span>
                  <span className={`font-mono text-[11px] ${s.cls}`}>{s.label}</span>
                  <span className="col-span-2 truncate font-mono text-[11px] text-mute">
                    {itemDetail(i)}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* approx strip */}
      <div className="flex items-center justify-between border-t border-line px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
        <span>
          in flight <span className="tnum text-ink">{fmtTilde(snap.approx.jobsInFlight)}</span>
        </span>
        <span>
          latency{" "}
          <span className="tnum text-signal-bright">
            {fmtRangeMs(snap.approx.latencyLo, snap.approx.latencyHi)}
          </span>{" "}
          varies
        </span>
        <Link href="/app" className="text-signal transition-colors hover:text-signal-bright">
          console →
        </Link>
      </div>
    </motion.div>
  );
}
