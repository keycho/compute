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
            <Scramble text="READY WHEN YOU ARE" />
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="display text-[clamp(2.6rem,6vw,5.4rem)]">
            Run something
            <br />
            on it<span className="text-signal">.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-7 max-w-[480px] font-mono text-[14px] leading-[1.75] text-dim">
            Ask a model a question. Render four frames. Point an idle GPU
            at the network and watch it earn. Every job leaves a receipt
            in the explorer.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button href="/execute" size="lg">
              Execute <span aria-hidden>→</span>
            </Button>
            <Button href="/create" size="lg" variant="ghost">
              Create
            </Button>
            <Button href="/supply" size="lg" variant="ghost">
              Supply
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
