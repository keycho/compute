"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * The provider side of the network: three steps from idle GPU to income,
 * next to a worker session that loops the way a real one would run.
 */

const STEPS = [
  {
    n: "01",
    title: "Run a lightweight worker",
    body: "One command installs the q0r worker. It benchmarks your hardware, attests the environment, and joins the mesh — a workstation with one GPU counts just as much as a rack with sixty-four.",
  },
  {
    n: "02",
    title: "Accept jobs automatically",
    body: "The scheduler routes work that fits your hardware. You set availability windows and a price floor; the worker handles everything else, including failover if you go offline.",
  },
  {
    n: "03",
    title: "Earn for completed execution",
    body: "Every verified job pays out in USDC at epoch settlement. Utilization, reliability, and response consistency raise your share over time.",
  },
];

const SESSION: Array<[cls: string, text: string]> = [
  ["text-dim", "$ q0r worker start"],
  ["text-pos", "✓ hardware detected · 2× RTX 5090"],
  ["text-pos", "✓ environment attested"],
  ["text-pos", "✓ joined mesh · eu-central · 34ms"],
  ["text-dim", "→ job 0x8f31 accepted · inference"],
  ["text-dim", "  executing … verified ✓"],
  ["text-cyan", "+ 2.41 USDC · epoch 1,284"],
  ["text-dim", "→ job 0xa412 accepted · rendering"],
  ["text-dim", "  executing … verified ✓"],
  ["text-cyan", "+ 5.87 USDC · epoch 1,284"],
  ["text-mute", "  uptime 99.4% · rank rising"],
];

function WorkerSession() {
  const [printed, setPrinted] = useState(0);
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPrinted(SESSION.length);
      return;
    }
    let timer: ReturnType<typeof setInterval> | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !timer) {
          timer = setInterval(() => {
            setPrinted((p) => (p >= SESSION.length ? (p > SESSION.length + 4 ? 0 : p + 1) : p + 1));
          }, 420);
        } else if (!entries[0].isIntersecting && timer) {
          clearInterval(timer);
          timer = null;
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <div ref={el} className="glass reticle overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="col-heading">Worker session</span>
        <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pos" aria-hidden />
          nd-4c1a · online
        </span>
      </div>
      <div className="min-h-[320px] p-6 font-mono text-[13px] leading-[2]">
        {SESSION.slice(0, printed).map(([cls, text], i) => (
          <div key={i} className={cls}>
            {text}
          </div>
        ))}
        <span className="mt-1 inline-block h-[15px] w-[8px] animate-pulse-dot bg-signal" aria-hidden />
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
        <span>session earnings</span>
        <span className="tnum text-cyan">8.28 USDC</span>
      </div>
    </div>
  );
}

export default function ShareCompute() {
  return (
    <section className="relative py-[clamp(110px,14vh,170px)]" id="providers">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,3,4,0.7), rgba(3,3,4,0.45) 50%, rgba(3,3,4,0.66))",
        }}
      />
      <div className="relative">
        <SectionHeader
          chip="FOR PROVIDERS"
          title={
            <>
              Share your compute.
              <br />
              Turn idle GPUs into income<span className="text-signal">.</span>
            </>
          }
          body="Most GPUs sit idle most of the day. On q0r, that idle time becomes supply: your hardware earns whenever the network has work that fits it."
        />

        <div className="container-x mt-16 grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="flex flex-col">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.07}>
                <div className="border-b border-line py-7 first:border-t">
                  <div className="flex items-baseline gap-5">
                    <span className="index-num">{s.n}</span>
                    <div>
                      <h3 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">
                        {s.title}
                      </h3>
                      <p className="mt-2.5 max-w-[480px] font-mono text-[13.5px] leading-[1.7] text-mute">
                        {s.body}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.15}>
            <WorkerSession />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
