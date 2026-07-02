import Reveal from "@/components/ui/Reveal";

const FACTS = [
  {
    n: "01",
    title: "Every market clears on-chain.",
    body: "Orders match in the sequencer and settle to the ledger in a single batch. No custodian sits between a position and its collateral.",
  },
  {
    n: "02",
    title: "Prices track physical capacity.",
    body: "The utilization oracle aggregates signed telemetry from GPU providers. Funding pushes perpetuals toward the real cost of compute.",
  },
  {
    n: "03",
    title: "Capacity is a bearer asset.",
    body: "Tokenized compute credits redeem for scheduled GPU time. They transfer, collateralize, and price like any other on-chain asset.",
  },
];

export default function SystemStrip() {
  return (
    <section className="hairline-b">
      <div className="container-x grid gap-0 md:grid-cols-3">
        {FACTS.map((f, i) => (
          <Reveal
            key={f.n}
            delay={i * 0.08}
            className={`border-line py-12 pr-8 md:border-l md:pl-8 ${i === 0 ? "md:border-l-0 md:pl-0" : ""}`}
          >
            <p className="index-num mb-6">{f.n}</p>
            <h2 className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">
              {f.title}
            </h2>
            <p className="mt-3 font-mono text-[13.5px] leading-[1.7] text-mute">{f.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
