import Reveal from "@/components/ui/Reveal";
import Scramble from "@/components/ui/Scramble";

const NETWORK_FACTS = [
  "jobs are matched to GPUs in real time",
  "execution is verified on completion",
  "failed runs are retried or rerouted",
  "workers are paid per successful output",
];

export default function WhyQ0r() {
  return (
    <section className="hairline-b relative" id="why">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgba(6,6,6,0.62)]" />
      <div className="container-x relative py-[clamp(90px,11vh,140px)]">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal>
            <p className="chip mb-6">
              <Scramble text="WHAT IS Q0R" />
            </p>
            <h2 className="display text-[clamp(2.2rem,4.2vw,3.6rem)]">
              A decentralized
              <br />
              compute network<span className="text-signal">.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="font-mono text-[15px] leading-[1.8] text-ink">
              Jobs are not sent to cloud providers. They are routed to available
              GPUs across a global mesh of independent machines.
            </p>
            <p className="mt-5 font-mono text-[15px] leading-[1.8] text-dim">
              Execution is not reserved — it is opportunistic. The network takes
              whatever capacity exists right now, uses it, verifies the output,
              and pays the machine that did the work.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal delay={0.05}>
            <p className="col-heading mb-5">Why it exists</p>
            <p className="font-mono text-[14px] leading-[1.8] text-dim">
              Compute is already distributed. It is just controlled by
              centralized providers — priced by a rate card, gated by quotas,
              parked behind sales calls.
            </p>
            <p className="mt-4 font-mono text-[14px] leading-[1.8] text-ink">
              q0r exposes the underlying machines directly.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="col-heading mb-5">The network</p>
            <ul className="flex flex-col">
              {NETWORK_FACTS.map((f) => (
                <li
                  key={f}
                  className="flex items-baseline gap-3 border-b border-line py-3.5 font-mono text-[14px] text-dim first:border-t"
                >
                  <span className="text-signal" aria-hidden>
                    →
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
