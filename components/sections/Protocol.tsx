"use client";

import { useState } from "react";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";

const STEPS = [
  {
    n: "01",
    title: "Order flow",
    body: "Orders enter through the gateway and match in a deterministic sequencer. Every fill is assigned a slot in the next settlement batch, typically within 400ms of receipt.",
    meta: "gateway → sequencer → batch",
  },
  {
    n: "02",
    title: "Clearing",
    body: "Positions margin against a unified collateral account. The risk engine re-marks every account each block; under-margined positions are auctioned to the liquidity vaults before they threaten the pool.",
    meta: "cross-margin · block-level marks",
  },
  {
    n: "03",
    title: "Settlement",
    body: "Batches commit to the ledger with validity proofs. Funding, fees, and PnL apply atomically — there is no end-of-day, only the next block.",
    meta: "validity proofs · atomic transfers",
  },
  {
    n: "04",
    title: "The oracle",
    body: "Providers stream signed utilization telemetry. The oracle aggregates it into the reference rates that funding pins to, weighting each feed by stake, uptime, and response consistency.",
    meta: "signed telemetry · stake-weighted",
  },
];

export default function Protocol() {
  const [open, setOpen] = useState(0);

  return (
    <section className="hairline-t py-[clamp(110px,14vh,170px)]" id="protocol">
      <SectionHeader
        chip="PROTOCOL"
        title={
          <>
            From order to
            <br />
            settled state<span className="text-signal">.</span>
          </>
        }
        body="The exchange is a pipeline with four stages. Each one is observable on-chain, block by block."
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
    </section>
  );
}
