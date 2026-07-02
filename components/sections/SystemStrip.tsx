import Reveal from "@/components/ui/Reveal";

const FACTS = [
  {
    n: "01",
    title: "Workloads route themselves.",
    body: "Applications submit jobs to the protocol. Discovery, placement, and failover happen in-network, weighted by latency, stake, and demand signals.",
  },
  {
    n: "02",
    title: "Every result is verified.",
    body: "Execution runs in attested environments and returns proofs. The network settles what it can verify and rejects what it cannot.",
  },
  {
    n: "03",
    title: "Rewards settle automatically.",
    body: "Providers earn per verified unit of work, weighted by utilization, reliability, and response consistency. No invoices, no intermediaries.",
  },
];

export default function SystemStrip() {
  return (
    <section className="hairline-b relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[rgba(3,3,4,0.55)]"
      />
      <div className="container-x relative grid gap-0 md:grid-cols-3">
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
