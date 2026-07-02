import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Scramble from "@/components/ui/Scramble";

export default function CtaBand() {
  return (
    <section className="hairline-t relative overflow-hidden">
      {/* local aurora */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[1100px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(closest-side, rgba(91,124,255,0.13), rgba(139,92,246,0.06) 55%, transparent 75%)",
        }}
      />
      <div className="container-x relative flex flex-col items-center py-[clamp(130px,18vh,210px)] text-center">
        <Reveal>
          <p className="chip mb-7">
            <Scramble text="MAINNET IS LIVE" />
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="display text-[clamp(2.6rem,6vw,5.4rem)]">
            Plug into the
            <br />
            network<span className="text-signal">.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-7 max-w-[480px] font-mono text-[14px] leading-[1.75] text-dim">
            Capacity is online. Routing is live. The mesh is verifying work
            right now — your first job is one request away.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button href="/app" size="lg">
              Launch Console <span aria-hidden>→</span>
            </Button>
            <Button href="#developers" size="lg" variant="ghost">
              Read the docs
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
