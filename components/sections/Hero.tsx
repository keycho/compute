"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import Scramble from "@/components/ui/Scramble";
import MarketTerminal from "./MarketTerminal";

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
  return (
    <section className="relative flex min-h-svh items-center pt-16" id="top">
      {/* readability scrim: keeps the left column legible over the scene */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[68%]"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 18% 50%, rgba(5,5,7,0.82), rgba(5,5,7,0.35) 55%, transparent 78%)",
        }}
      />
      <div className="container-x relative grid w-full items-center gap-14 pb-24 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <motion.p {...enter(0.1)} className="chip mb-7">
            <Scramble text="THE FINANCIAL LAYER FOR COMPUTE" duration={700} />
          </motion.p>

          <motion.h1
            {...enter(0.22)}
            className="display text-[clamp(2.5rem,4.6vw,4.6rem)]"
          >
            Trade the price
            <br />
            of computation<span className="text-signal">.</span>
          </motion.h1>

          <motion.p
            {...enter(0.38)}
            className="mt-8 max-w-[560px] font-mono text-[15px] leading-[1.75] text-dim"
          >
            Compute Markets is an on-chain exchange where GPU capacity clears as
            a financial asset. Perpetual futures, tokenized compute credits, and
            infrastructure indexes settle against live utilization data from the
            network oracle.
          </motion.p>

          <motion.div {...enter(0.52)} className="mt-10 flex flex-wrap items-center gap-4">
            <Button href="/app" size="lg">
              Launch App <span aria-hidden>→</span>
            </Button>
            <Button href="#markets" size="lg" variant="ghost">
              View Markets
            </Button>
          </motion.div>

          <motion.div
            {...enter(0.66)}
            className="mt-14 flex flex-wrap gap-x-10 gap-y-4 font-mono text-[11px] uppercase tracking-[0.13em] text-mute"
          >
            <span>
              <span className="text-ink tnum">$1.2B+</span> cumulative volume
            </span>
            <span>
              <span className="text-ink tnum">6</span> live markets
            </span>
            <span>
              <span className="text-ink tnum">400ms</span> settlement finality
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 44, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: 0.5, ease }}
          className="flex justify-center lg:justify-end"
        >
          <MarketTerminal />
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
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
          scroll
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
