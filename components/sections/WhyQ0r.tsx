import Reveal from "@/components/ui/Reveal";
import Scramble from "@/components/ui/Scramble";

const PILLARS = [
  {
    title: "No infrastructure to manage",
    body: "You never provision servers, images, or clusters. Describe the job — container, hardware class, verification policy — and the network runs it. Scaling up means changing a number, not an architecture.",
  },
  {
    title: "No centralized scheduler",
    body: "Routing happens in-protocol, weighted by latency, load, and provider reliability. No company decides whose job runs where, and no single outage can take the network down.",
  },
  {
    title: "No single provider",
    body: "Capacity comes from thousands of independent operators — workstations, render farms, and datacenters. Prices come from open participation, not a rate card.",
  },
];

export default function WhyQ0r() {
  return (
    <section className="hairline-b relative" id="why">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgba(3,3,4,0.62)]" />
      <div className="container-x relative py-[clamp(90px,11vh,140px)]">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal>
            <p className="chip mb-6">
              <Scramble text="WHY Q0R" />
            </p>
            <h2 className="display text-[clamp(2.2rem,4.2vw,3.6rem)]">
              Why q0r<span className="text-signal">?</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="font-mono text-[15px] leading-[1.8] text-dim">
              Traditional cloud compute is expensive, centralized, and
              permissioned. Capacity sits in a handful of regions, priced by a
              handful of companies, behind quotas and sales calls.
            </p>
            <p className="mt-5 font-mono text-[15px] leading-[1.8] text-ink">
              q0r takes the opposite approach: it turns independent GPUs — from
              a single workstation to an entire datacenter — into one global
              execution network that anyone can use and anyone can join.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-0 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal
              key={p.title}
              delay={i * 0.08}
              className={`border-line py-8 pr-8 md:border-l md:pl-8 ${i === 0 ? "md:border-l-0 md:pl-0" : ""}`}
            >
              <h3 className="font-display text-[18px] font-semibold tracking-[-0.01em] text-ink">
                {p.title}
              </h3>
              <p className="mt-3 font-mono text-[13.5px] leading-[1.7] text-mute">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
