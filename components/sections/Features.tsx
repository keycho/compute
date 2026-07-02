"use client";

import Reveal from "@/components/ui/Reveal";
import Scramble from "@/components/ui/Scramble";
import SectionHeader from "@/components/ui/SectionHeader";

/** Line-art glyphs, drawn to sit inside a 44px reticle. */
const Icons = {
  routing: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25">
      <circle cx="6" cy="22" r="2.5" />
      <circle cx="38" cy="8" r="2.5" />
      <circle cx="38" cy="22" r="2.5" />
      <circle cx="38" cy="36" r="2.5" />
      <path d="M8.5 22 C 20 22, 24 8, 35.5 8" strokeOpacity="0.9" />
      <path d="M8.5 22 H 35.5" strokeOpacity="0.5" />
      <path d="M8.5 22 C 20 22, 24 36, 35.5 36" strokeOpacity="0.3" />
    </svg>
  ),
  verify: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M22 4 L37 13 V31 L22 40 L7 31 V13 Z" />
      <path d="M15 22 L20 27 L30 16" strokeWidth="1.5" />
    </svg>
  ),
  rewards: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M4 28 C10 22, 16 22, 22 28 S 34 34, 40 28" />
      <path d="M4 18 C10 12, 16 12, 22 18 S 34 24, 40 18" strokeOpacity="0.55" />
      <circle cx="22" cy="10" r="2" fill="currentColor" stroke="none" />
      <path d="M22 12 V 16" strokeOpacity="0.7" />
    </svg>
  ),
  fabric: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M6 40 V22" />
      <path d="M16 40 V12" />
      <path d="M26 40 V28" />
      <path d="M36 40 V6" />
      <path d="M6 22 L16 12 L26 28 L36 6" strokeOpacity="0.4" strokeDasharray="2 3" />
    </svg>
  ),
};

const CARDS = [
  {
    n: "01",
    icon: Icons.routing,
    title: "Routing",
    body: "Jobs enter the mesh and land on the best available provider. Placement weighs latency, stake, and live demand; failover re-routes mid-flight without the application noticing.",
    tag: "latency · stake · demand signals",
  },
  {
    n: "02",
    icon: Icons.verify,
    title: "Verified execution",
    body: "Every job runs in an attested environment and returns a proof of execution. Results settle only when the network can verify them; providers that fail verification are slashed.",
    tag: "attestation · proofs · slashing",
  },
  {
    n: "03",
    icon: Icons.rewards,
    title: "Provider rewards",
    body: "Providers earn per verified unit of work each epoch. Utilization, reliability, and response consistency weight the payout; settlement is autonomous.",
    tag: "epochs · autonomous settlement",
  },
  {
    n: "04",
    icon: Icons.fabric,
    title: "Programmable infrastructure",
    body: "The network presents as a single machine. Capacity is addressable through one API, composable by any application, and scales with the mesh instead of a datacenter.",
    tag: "one network · any workload",
  },
];

export default function Features() {
  return (
    <section className="relative py-[clamp(110px,14vh,170px)]" id="protocol">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-full"
        style={{
          background:
            "linear-gradient(to bottom, rgba(3,3,4,0.72), rgba(3,3,4,0.35) 45%, rgba(3,3,4,0.6))",
        }}
      />
      <div className="relative">
        <SectionHeader
          chip="PROTOCOL"
          title={
            <>
              One network.
              <br />
              Four guarantees<span className="text-signal">.</span>
            </>
          }
          body="Discovery, execution, verification, and settlement run in-protocol. Applications consume compute; the network handles everything underneath."
        />

        <div className="container-x mt-20 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {CARDS.map((c, i) => (
            <Reveal key={c.n} delay={i * 0.09} className={i % 2 === 1 ? "xl:translate-y-10" : ""}>
              <article className="glass reticle glow-hover group flex h-full flex-col p-7">
                <div className="mb-9 flex items-start justify-between">
                  <span className="index-num">{c.n}</span>
                  <span className="h-11 w-11 text-mute transition-colors duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] group-hover:text-signal-bright">
                    {c.icon}
                  </span>
                </div>
                <h3 className="font-display text-[21px] font-semibold tracking-[-0.01em] text-ink">
                  {c.title}
                </h3>
                <p className="mt-3.5 flex-1 font-mono text-[13px] leading-[1.7] text-mute">
                  {c.body}
                </p>
                <p className="mt-7 border-t border-line pt-4 font-mono text-[10.5px] uppercase tracking-[0.13em] text-mute transition-colors duration-300 group-hover:text-signal">
                  <Scramble text={c.tag} replayOnHover />
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
