"use client";

import Reveal from "@/components/ui/Reveal";
import Scramble from "@/components/ui/Scramble";
import { useFeed } from "@/lib/useFeed";
import { fmtCompact, fmtTilde } from "@/lib/format";

/**
 * Not a tokenomics page — a live settlement and staking system being
 * observed. State first, behavior second, one idea at the end.
 */

function StateRow({
  label,
  value,
  note,
  cls,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  cls?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-4 first:border-t">
      <span className="font-mono text-[13px] text-mute">{label}</span>
      <span className="text-right">
        <span className={`tnum font-mono text-[15px] ${cls ?? "text-ink"}`}>{value}</span>
        {note && <span className="ml-2 font-mono text-[11px] text-mute">{note}</span>}
      </span>
    </div>
  );
}

const SPLITS = [
  { label: "provider payouts", note: "per verified output" },
  { label: "staker rewards", note: "USDC · per epoch" },
  { label: "protocol reserve", note: "governed on-chain" },
  { label: "$Q0R buyback + burn", note: "per execution batch" },
];

export default function Token() {
  const snap = useFeed();
  const a = snap.approx;

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
      <div className="container-x relative">
        <Reveal>
          <p className="chip mb-6">
            <Scramble text="Q0R TOKEN" />
          </p>
          <h2 className="display text-[clamp(2.2rem,4.2vw,3.6rem)]">
            Stake $Q0R<span className="text-signal">.</span> Self-custody
            <span className="text-signal">.</span>
          </h2>
          <p className="mt-6 max-w-[520px] font-mono text-[14.5px] leading-[1.8] text-dim">
            Your Q0R stays in your wallet. Only stake weight is read by the
            network.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* live system state */}
          <Reveal>
            <div className="glass reticle p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="col-heading">live system state</span>
                <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                  <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pos" aria-hidden />
                  epoch {snap.epoch.toLocaleString()}
                </span>
              </div>
              <StateRow
                label="$Q0R staked"
                value={`${a.stakedM.toFixed(1)}m`}
                note="fluctuating across routing pools"
              />
              <StateRow
                label="protocol revenue (epoch)"
                value={fmtCompact(a.revenueEpoch)}
                note="from completed jobs"
              />
              <StateRow
                label="burn activity"
                value={
                  a.lastBurn
                    ? `${a.lastBurn.amount.toLocaleString()} Q0R`
                    : "updating"
                }
                note={a.lastBurn ? `last batch · ${a.lastBurn.state}` : "per execution batch"}
                cls="text-cyan"
              />
              <StateRow
                label="staker rewards"
                value={fmtCompact(a.rewardsPaidEpoch * 0.06)}
                note="USDC · distributing"
              />
              <StateRow
                label="buyback flow"
                value={
                  a.lastBuyback ? `${a.lastBuyback.amount.toLocaleString()} Q0R` : "queued"
                }
                note={a.lastBuyback ? `open market · ${a.lastBuyback.state}` : "awaiting batch"}
                cls="text-cyan"
              />
              <StateRow
                label="slashing events"
                value={a.slashesEpoch}
                note="failed or invalid execution"
                cls="text-neg"
              />
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-5">
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                    $Q0R burned · rolling
                  </p>
                  <p className="tnum mt-1 font-display text-[22px] font-semibold text-ink">
                    {fmtTilde(a.burnedTotal).replace("~", "~")}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                    pending settlement
                  </p>
                  <p className="tnum mt-1 font-display text-[22px] font-semibold text-mute">
                    {fmtTilde(a.pendingSettlement).replace("~", "~$")}
                  </p>
                  <p className="font-mono text-[10px] text-mute">finalizing next epoch window</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* behavior */}
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col justify-between gap-10">
              <div>
                <p className="col-heading mb-4">stake behavior</p>
                <p className="font-mono text-[14px] leading-[1.8] text-dim">
                  staking does not unlock features. it changes routing weight.
                </p>
                <p className="mt-3 font-mono text-[14px] leading-[1.8] text-ink">
                  higher stake → higher trust score → more job allocation.
                </p>
                <p className="mt-3 font-mono text-[13px] leading-[1.8] text-mute">
                  unstaked tokens have no routing influence.
                </p>
              </div>

              <div>
                <p className="col-heading mb-4">value flow</p>
                <p className="mb-4 font-mono text-[13px] leading-[1.7] text-dim">
                  compute jobs generate USDC revenue. it splits continuously into:
                </p>
                <ul className="flex flex-col">
                  {SPLITS.map((s) => (
                    <li
                      key={s.label}
                      className="flex items-baseline justify-between border-b border-line py-3 font-mono text-[13px] first:border-t"
                    >
                      <span className="text-ink">{s.label}</span>
                      <span className="text-[11px] text-mute">{s.note}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[13px] leading-[1.8] text-dim">
                  burn is not scheduled.{" "}
                  <span className="text-ink">it happens when compute happens.</span>
                </p>
              </div>

              <div>
                <p className="col-heading mb-4">slashing</p>
                <p className="font-mono text-[13px] leading-[1.8] text-mute">
                  invalid execution reduces trust: stake reduction, routing
                  weight decrease, possible exclusion from the job pool.{" "}
                  <span className="text-dim">failure is part of system behavior.</span>
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* core idea */}
        <Reveal delay={0.15}>
          <div className="mx-auto mt-20 max-w-[640px] border-t border-line pt-10 text-center">
            <p className="font-mono text-[14px] leading-[1.9] text-dim">
              Q0R is not a utility token. it is a coordination signal for
              compute execution.
            </p>
            <p className="mt-3 font-mono text-[14px] leading-[1.9] text-ink">
              the network runs regardless. the token enforces trust between
              machines that do not know each other.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
