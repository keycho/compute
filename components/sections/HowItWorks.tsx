import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * The lifecycle of a job, top to bottom. No accordion, no reveal on
 * click — the whole path is visible at once, the way a diagram would be.
 */

const STEPS = [
  {
    n: "01",
    title: "Applications submit workloads.",
    body: "A signed request describes the job: container image, hardware class, replica count, verification policy.",
  },
  {
    n: "02",
    title: "The scheduler discovers providers.",
    body: "Discovery scores every eligible provider on latency, current load, stake, and reliability history. Placement lands in about 100ms.",
  },
  {
    n: "03",
    title: "Jobs are encrypted and distributed.",
    body: "Payloads are encrypted end-to-end. Providers receive only what they need to execute — never your data in the clear.",
  },
  {
    n: "04",
    title: "Providers execute.",
    body: "Work runs in attested environments on hardware that matches the request. If a provider degrades, the job re-routes mid-flight.",
  },
  {
    n: "05",
    title: "Results are verified.",
    body: "Every output returns with a proof of execution. The network accepts only what it can verify; failed attestation slashes the provider's stake.",
  },
  {
    n: "06",
    title: "Rewards settle automatically.",
    body: "Verified work pays providers in USDC each epoch. Applications pay for completed results — nothing else.",
  },
];

export default function HowItWorks() {
  return (
    <section className="hairline-t relative py-[clamp(110px,14vh,170px)]" id="how">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[rgba(3,3,4,0.62)]" />
      <div className="relative">
        <SectionHeader
          chip="HOW Q0R WORKS"
          title={
            <>
              From workload
              <br />
              to verified result<span className="text-signal">.</span>
            </>
          }
          body="Six steps, all in-protocol, all observable in real time. This is the entire lifecycle of a job."
        />

        <div className="container-x mt-16 max-w-[820px]">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05}>
              <div className="grid grid-cols-[56px_1fr] gap-x-6">
                {/* rail: number + connector */}
                <div className="flex flex-col items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-[rgba(8,9,14,0.8)] font-mono text-[12px] text-signal-bright">
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
