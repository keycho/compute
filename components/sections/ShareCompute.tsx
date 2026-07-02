import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * The provider side of the network: three steps from idle GPU to income,
 * next to the actual commands a worker runs. No simulated session logs
 * or invented earnings — honest capability over simulated scale.
 */

const STEPS = [
  {
    n: "01",
    title: "Run a lightweight worker",
    body: "One command installs the q0r worker. It benchmarks your hardware, attests the environment, and joins the mesh — a workstation with one GPU counts just as much as a rack with sixty-four.",
  },
  {
    n: "02",
    title: "Accept jobs automatically",
    body: "The scheduler routes work that fits your hardware. You set availability windows and a price floor; the worker handles everything else, including failover if you go offline.",
  },
  {
    n: "03",
    title: "Earn for completed execution",
    body: "Every verified job pays out in USDC at epoch settlement. Utilization, reliability, and response consistency raise your share over time.",
  },
];

// the actual provider path, as commands — not a simulated session
const COMMANDS: Array<{ cmt: string; cmd: string }> = [
  { cmt: "# install the worker — benchmarks + attests your hardware", cmd: "curl -sL get.q0r.network | sh" },
  { cmt: "# connect the wallet your rewards settle to", cmd: "q0r wallet connect" },
  { cmt: "# join the mesh and start accepting jobs", cmd: "q0r worker start" },
];

function WorkerSetup() {
  return (
    <div className="glass reticle overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="col-heading">Worker setup</span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
          three commands
        </span>
      </div>
      <div className="flex min-h-[280px] flex-col justify-center gap-6 p-6 font-mono text-[13px] leading-[1.8]">
        {COMMANDS.map((c) => (
          <div key={c.cmd}>
            <p className="text-mute">{c.cmt}</p>
            <p className="mt-1 text-dim">
              <span className="text-signal">$</span> {c.cmd}
            </p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
        <span>paid per verified output · settled in USDC</span>
        <Link href="/supply" className="text-signal transition-colors hover:text-signal-bright">
          the full path →
        </Link>
      </div>
    </div>
  );
}

export default function ShareCompute() {
  return (
    <section className="relative py-[clamp(110px,14vh,170px)]" id="providers">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,6,6,0.7), rgba(6,6,6,0.45) 50%, rgba(6,6,6,0.66))",
        }}
      />
      <div className="relative">
        <SectionHeader
          chip="FOR PROVIDERS"
          title={
            <>
              Share your compute.
              <br />
              Turn idle GPUs into income<span className="text-signal">.</span>
            </>
          }
          body="Most GPUs sit idle most of the day. On q0r, that idle time becomes supply: your hardware earns whenever the network has work that fits it."
        />

        <div className="container-x mt-16 grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="flex flex-col">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.07}>
                <div className="border-b border-line py-7 first:border-t">
                  <div className="flex items-baseline gap-5">
                    <span className="index-num">{s.n}</span>
                    <div>
                      <h3 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">
                        {s.title}
                      </h3>
                      <p className="mt-2.5 max-w-[480px] font-mono text-[13.5px] leading-[1.7] text-mute">
                        {s.body}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.15}>
            <WorkerSetup />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
