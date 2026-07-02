import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * The lifecycle of a job, top to bottom — visible at once, the way a
 * diagram would be. Failure is part of the path, so it gets a step.
 */

const STEPS = [
  {
    n: "01",
    title: "You submit a job.",
    body: "A signed request: container, hardware class, verification policy. No reservation, no quota — the job enters the mesh directly.",
  },
  {
    n: "02",
    title: "The network finds a worker.",
    body: "Matching happens in real time against whatever capacity exists right now — scored on latency, load, and reliability history.",
  },
  {
    n: "03",
    title: "The worker executes and streams results back.",
    body: "Work runs in an attested environment. Output streams back as it is produced, with a proof attached on completion.",
  },
  {
    n: "04",
    title: "If a node fails, the job reroutes automatically.",
    body: "Dropouts, thermal throttling, dead peers — all normal. The job moves to another worker and keeps going. Failed runs are retried.",
  },
  {
    n: "05",
    title: "Verified output gets paid.",
    body: "The network settles per successful result, each epoch, in USDC. Unverifiable work is not paid.",
  },
];

export default function HowItWorks() {
  return (
    <section className="hairline-t relative py-[clamp(110px,14vh,170px)]" id="how">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgba(6,6,6,0.62)]" />
      <div className="relative">
        <SectionHeader
          chip="HOW IT WORKS"
          title={
            <>
              Execution is
              <br />
              opportunistic<span className="text-signal">.</span>
            </>
          }
          body="Nothing is reserved ahead of time. The network uses the capacity that exists at the moment you need it — and routes around whatever breaks."
        />

        <div className="container-x mt-16 max-w-[820px]">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05}>
              <div className="grid grid-cols-[56px_1fr] gap-x-6">
                {/* rail: number + connector */}
                <div className="flex flex-col items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-[rgba(12,12,12,0.8)] font-mono text-[12px] text-signal-bright">
                    {s.n}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="relative my-1 w-px flex-1 bg-line" aria-hidden>
                      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 font-mono text-[11px] leading-none text-signal">
                        ↓
                      </span>
                    </span>
                  )}
                </div>
                <div className={i < STEPS.length - 1 ? "pb-10" : ""}>
                  <h3 className="pt-2 font-display text-[clamp(1.25rem,2.1vw,1.6rem)] font-semibold tracking-[-0.015em] text-ink">
                    {s.title}
                  </h3>
                  <p className="mt-2.5 max-w-[560px] font-mono text-[13.5px] leading-[1.7] text-mute">
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
