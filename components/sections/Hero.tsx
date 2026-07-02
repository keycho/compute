"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Scramble from "@/components/ui/Scramble";
import { useFeed } from "@/lib/useFeed";
import Telemetry from "./Telemetry";

const ease = [0.7, 0, 0.3, 1] as const;

// MotionConfig reducedMotion="user" (app/layout.tsx) strips the transform
// and blur for reduced-motion users while opacity still resolves to 1, so
// these props are safe to render on the server unconditionally.
const enter = (delay: number) => ({
  initial: { opacity: 0, y: 34, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 1, delay, ease },
});

export default function Hero() {
  const snap = useFeed();

  return (
    <section className="relative flex min-h-svh items-center pt-16" id="top">
      {/* readability scrim: keeps the left column legible over the scene */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[72%]"
        style={{
          background:
            "radial-gradient(ellipse 92% 72% at 16% 50%, rgba(3,3,4,0.92), rgba(3,3,4,0.5) 55%, transparent 80%)",
        }}
      />
      <div className="container-x relative grid w-full items-center gap-14 pb-24 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <motion.p {...enter(0.1)} className="chip mb-7">
            <Scramble text="DECENTRALIZED GPU NETWORK" duration={700} />
          </motion.p>

          <motion.h1
            {...enter(0.22)}
            className="display text-[clamp(2.5rem,4.3vw,4.3rem)]"
          >
            Compute powered
            <br />
            by people, not
            <br />
            hyperscalers<span className="text-signal">.</span>
          </motion.h1>

          <motion.p
            {...enter(0.38)}
            className="mt-8 max-w-[560px] font-mono text-[15px] leading-[1.75] text-dim"
          >
            Run AI, rendering, and high-performance workloads across a
            decentralized network of independent GPU providers. Submit a job
            through one API — the network finds the hardware, verifies the
            result, and pays the people who ran it.
          </motion.p>

          <motion.div {...enter(0.52)} className="mt-10 flex flex-wrap items-center gap-4">
            <Button href="/app" size="lg">
              Launch App <span aria-hidden>→</span>
            </Button>
            <Button href="#developers" size="lg" variant="ghost">
              Read Docs
            </Button>
          </motion.div>

          <motion.div
            {...enter(0.66)}
            className="mt-14 flex flex-wrap gap-x-10 gap-y-4 font-mono text-[11px] uppercase tracking-[0.13em] text-mute"
          >
            <span>
              <span className="tnum text-ink">{snap.approx.providersMasked}</span> active
              providers
            </span>
            <span>
              <span className="tnum text-ink">
                ~{Math.round(snap.approx.jobsInFlight / 1000)}k
              </span>{" "}
              jobs in flight
            </span>
            <span>
              <span className="tnum text-ink">
                {Math.round(snap.approx.latencyLo)}–{Math.round(snap.approx.latencyHi)}ms
              </span>{" "}
              latency · varies
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 44, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 0.5, ease }}
          className="flex justify-center lg:justify-end"
        >
          <Telemetry />
        </motion.div>
      </div>

      {/* scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
        aria-hidden
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
          descend
        </span>
        <span className="block h-8 w-px overflow-hidden bg-line">
          <motion.span
            className="block h-3 w-px bg-signal"
            animate={{ y: [-12, 32] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.div>
    </section>
  );
}
