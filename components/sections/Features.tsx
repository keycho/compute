"use client";

import Reveal from "@/components/ui/Reveal";
import Scramble from "@/components/ui/Scramble";
import SectionHeader from "@/components/ui/SectionHeader";

/** Line-art glyphs, drawn to sit inside a 44px reticle. */
const Icons = {
  perp: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M4 30 L14 20 L22 26 L40 8" />
      <path d="M32 8 H40 V16" />
      <circle cx="14" cy="20" r="2" fill="currentColor" stroke="none" />
      <circle cx="22" cy="26" r="2" fill="currentColor" stroke="none" />
      <path d="M4 38 H40" strokeOpacity="0.3" strokeDasharray="2 4" />
    </svg>
  ),
  token: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M22 4 L37 13 V31 L22 40 L7 31 V13 Z" />
      <path d="M22 13 L29.5 17.5 V26.5 L22 31 L14.5 26.5 V17.5 Z" strokeOpacity="0.55" />
      <circle cx="22" cy="22" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  liquidity: (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M4 28 C10 22, 16 22, 22 28 S 34 34, 40 28" />
      <path d="M4 18 C10 12, 16 12, 22 18 S 34 24, 40 18" strokeOpacity="0.55" />
      <path d="M4 38 C10 32, 16 32, 22 38 S 34 44, 40 38" strokeOpacity="0.3" />
    </svg>
  ),
  index: (
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
    icon: Icons.perp,
    title: "Perpetual markets",
    body: "Long or short GPU-hour rates with cross-margin leverage. Funding accrues hourly against the utilization oracle, keeping every contract pinned to physical demand.",
    tag: "H100 · B200 · A100 · RTX5090",
  },
  {
    n: "02",
    icon: Icons.token,
    title: "Tokenized compute",
    body: "Compute credits are bearer claims on scheduled GPU time. They transfer instantly, post as collateral, and redeem against any provider in the mesh.",
    tag: "ERC-20 · redeemable · composable",
  },
  {
    n: "03",
    icon: Icons.liquidity,
    title: "Liquidity",
    body: "Passive vaults quote two-sided markets from pooled capital. Depositors earn maker rebates, funding spread, and liquidation fees, marked to book in real time.",
    tag: "vaults · rebates · real-time PnL",
  },
  {
    n: "04",
    icon: Icons.index,
    title: "Indexes",
    body: "Basket products track training and inference capacity across the network. One position prices an entire class of AI infrastructure.",
    tag: "INFER-IDX · TRAIN-IDX",
  },
];

export default function Features() {
  return (
    <section className="relative py-[clamp(110px,14vh,170px)]" id="markets">
      <SectionHeader
        chip="MARKET STRUCTURE"
        title={
          <>
            Four instruments.
            <br />
            One settlement layer<span className="text-signal">.</span>
          </>
        }
        body="Every product clears through the same on-chain engine and margins against the same collateral pool. Nothing here is an IOU on a cloud invoice."
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
              <p className="mt-7 border-t border-line pt-4 font-mono text-[10.5px] uppercase tracking-[0.13em] text-faint transition-colors duration-300 group-hover:text-signal">
                <Scramble text={c.tag} replayOnHover />
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
