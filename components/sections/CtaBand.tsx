import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Scramble from "@/components/ui/Scramble";

/**
 * The close answers the hero's question. Concrete, product-true: one
 * prompt, a stranger's GPU, a verified receipt — no scale claims.
 */
export default function CtaBand() {
  return (
    <section className="hairline-t relative overflow-hidden">
      {/* readability scrim: keeps the headline clear of the grain field */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 62% 75% at 50% 52%, rgba(6,6,6,0.88), rgba(6,6,6,0.4) 62%, transparent 82%)",
        }}
      />
      {/* quiet local glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[1100px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.1), rgba(255,255,255,0.04) 55%, transparent 75%)",
        }}
      />
      <div className="container-x relative flex flex-col items-center py-[clamp(130px,18vh,210px)] text-center">
        <Reveal>
          <p className="chip mb-7">
            <Scramble text="ONE PROMPT AWAY" />
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="display text-[clamp(2.6rem,6vw,5.4rem)]">
            Execute
            <br />
            something<span className="text-signal">.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-7 max-w-[520px] font-mono text-[14px] leading-[1.75] text-dim">
            Ask a model a question. It runs on someone&apos;s idle GPU,
            streams back verified, and hands you a receipt that proves the
            work — in seconds, for a fraction of a cent.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button href="/execute" size="lg">
              Execute now <span aria-hidden>→</span>
            </Button>
            <Button href="/create" size="lg" variant="ghost">
              Create images
            </Button>
            <Button href="/supply" size="lg" variant="ghost">
              Supply a GPU
            </Button>
          </div>
        </Reveal>
        <Reveal delay={0.4}>
          <p className="mt-9 font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">
            permissionless · pay per execution · every job leaves a receipt
          </p>
        </Reveal>
      </div>
    </section>
  );
}
