"use client";

import { useState } from "react";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";

const STEPS = [
  {
    n: "01",
    title: "Submit",
    body: "Applications post workloads to the gateway: a container image, resource requirements, and a verification policy. No accounts to provision, no capacity to reserve — the job enters the mesh directly.",
    meta: "gateway → mesh · one request",
  },
  {
    n: "02",
    title: "Route",
    body: "Discovery scores every eligible provider on latency, stake, current load, and reliability history. Placement is decided in-network within ~100ms, and re-routing happens mid-flight if a provider degrades.",
    meta: "latency · stake · demand signals",
  },
  {
    n: "03",
    title: "Execute and verify",
    body: "Jobs run in attested environments and stream results with proofs of execution. The network accepts only what it can verify; failed attestation slashes the provider's stake.",
    meta: "attested runtimes · execution proofs",
  },
  {
    n: "04",
    title: "Settle",
    body: "Rewards accrue per verified unit of work and settle each epoch, weighted by utilization, reliability, and response consistency. Applications pay for verified results, nothing else.",
    meta: "epochs · autonomous settlement",
  },
];

export default function Protocol() {
  const [open, setOpen] = useState(0);

  return (
    <section className="hairline-t relative py-[clamp(110px,14vh,170px)]" id="execution">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[rgba(3,3,4,0.6)]"
      />
      <div className="relative">
        <SectionHeader
          chip="EXECUTION PIPELINE"
          title={
            <>
              From workload
              <br />
              to verified result<span className="text-signal">.</span>
            </>
          }
          body="Execution is a pipeline with four stages. Each one runs in-protocol and is observable in real time."
        />

        <div className="container-x mt-16 max-w-[980px]">
          {STEPS.map((s, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={s.n} delay={i * 0.05}>
                <div className="border-b border-line first:border-t">
                  <button
                    className="grid w-full grid-cols-[64px_1fr_32px] items-center gap-4 py-8 text-left transition-opacity duration-150 hover:opacity-80"
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                  >
                    <span className={`index-num transition-colors duration-300 ${isOpen ? "!text-signal-bright" : ""}`}>
                      {s.n}
                    </span>
                    <span className="font-display text-[clamp(1.4rem,2.6vw,2rem)] font-semibold tracking-[-0.02em] text-ink">
                      {s.title}
                    </span>
                    <span
                      className={`justify-self-end font-mono text-[22px] font-light text-mute transition-transform duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] ${isOpen ? "rotate-45" : ""}`}
                      aria-hidden
                    >
                      +
                    </span>
                  </button>
                  <div
                    className="grid transition-[grid-template-rows] duration-500 ease-linear"
                    style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="grid gap-6 pb-9 md:grid-cols-[64px_1fr]">
                        <span />
                        <div>
                          <p className="max-w-[600px] font-mono text-[14px] leading-[1.75] text-dim">
                            {s.body}
                          </p>
                          <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-signal">
                            {s.meta}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
