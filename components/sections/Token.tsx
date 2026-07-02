"use client";

import CountUp from "@/components/ui/CountUp";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";
import { useProtocol } from "@/lib/useProtocol";
import { fmtCompact } from "@/lib/format";

/**
 * Protocol economics — deliberately placed after the product story.
 * The flow diagram reads top to bottom: applications pay for compute,
 * the protocol captures a fee, value routes to the treasury, stakers,
 * and providers.
 */

const FLOWS = [
  {
    title: "Applications pay for completed compute",
    body: "Jobs are priced per verified unit of work. Nothing is charged for failed or unverifiable execution.",
  },
  {
    title: "The protocol captures execution fees",
    body: "A fixed percentage of every settled job accrues to the protocol as revenue.",
  },
  {
    title: "Revenue flows into the treasury",
    body: "The treasury funds audits, client development, and provider incentives — governed on-chain.",
  },
  {
    title: "Stakers secure routing and earn rewards",
    body: "Q0R staked on providers backs their reliability. Honest operation earns protocol rewards; failed verification is slashed.",
  },
  {
    title: "Providers receive execution rewards",
    body: "The bulk of every payment goes to the hardware that did the work, settled in USDC each epoch.",
  },
];

export default function Token() {
  const snap = useProtocol();

  return (
    <section className="hairline-t relative py-[clamp(110px,14vh,170px)]" id="token">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,3,4,0.64), rgba(3,3,4,0.44) 50%, rgba(3,3,4,0.68))",
        }}
      />
      <div className="relative">
        <SectionHeader
          chip="Q0R TOKEN"
          title={
            <>
              Economics that
              <br />
              follow the work<span className="text-signal">.</span>
            </>
          }
          body="Value in the protocol moves the same direction as compute: from the applications that consume it to the people who supply it."
        />

        <div className="container-x mt-16 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="flex flex-col">
            {FLOWS.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div className="group border-b border-line py-6 first:border-t">
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-[11px] text-signal" aria-hidden>
                      {i === 0 ? "●" : "↓"}
                    </span>
                    <div>
                      <h3 className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
                        {f.title}
                      </h3>
                      <p className="mt-2 max-w-[520px] font-mono text-[13px] leading-[1.7] text-mute">
                        {f.body}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.15}>
            <div className="glass reticle flex h-full flex-col p-7">
              <span className="col-heading mb-8">This epoch · live</span>
              <div className="flex flex-1 flex-col justify-between gap-7">
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                    Execution settled
                  </p>
                  <CountUp
                    value={snap.epochRewards * 9}
                    format={(v) => fmtCompact(v)}
                    className="font-display text-[34px] font-semibold text-ink"
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                      Provider rewards
                    </p>
                    <CountUp
                      value={snap.epochRewards * 9 * 0.85}
                      format={(v) => fmtCompact(v)}
                      className="font-display text-[22px] font-semibold text-cyan"
                    />
                    <p className="mt-0.5 font-mono text-[10px] text-mute">85% · USDC</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">
                      Protocol fee
                    </p>
                    <CountUp
                      value={snap.epochRewards * 9 * 0.15}
                      format={(v) => fmtCompact(v)}
                      className="font-display text-[22px] font-semibold text-signal-bright"
                    />
                    <p className="mt-0.5 font-mono text-[10px] text-mute">15% · treasury + stakers</p>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex justify-between font-mono text-[10.5px] uppercase tracking-[0.12em]">
                    <span className="text-faint">Fee split</span>
                    <span className="text-mute">treasury 60 / stakers 40</span>
                  </div>
                  <div className="flex h-[6px] overflow-hidden rounded-full">
                    <span className="w-[60%] bg-[rgba(91,124,255,0.55)]" />
                    <span className="w-[40%] bg-[rgba(139,92,246,0.55)]" />
                  </div>
                </div>
                <p className="border-t border-line pt-5 font-mono text-[12px] leading-[1.7] text-mute">
                  Applications never hold Q0R to use the network — jobs are paid
                  in stable value. The token secures routing and governs the
                  treasury.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
