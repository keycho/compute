"use client";

import { AnimatePresence, motion } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import { useFeed } from "@/lib/useFeed";

/**
 * The provider path, five steps top to bottom, with the network's own
 * evidence streaming beside it: nodes joining, jobs accepted, rewards
 * settling. No documentation wall — the feed is the pitch.
 */

const STEPS = [
  {
    title: "Install worker",
    body: "one command. it benchmarks your hardware and attests the environment.",
    code: "curl -sL get.q0r.network | sh",
  },
  {
    title: "Connect wallet",
    body: "rewards settle to an address you control. nothing is custodied.",
    code: "q0r wallet connect",
  },
  {
    title: "Run worker",
    body: "join the mesh. set availability windows and a price floor if you want.",
    code: "q0r worker start",
  },
  {
    title: "Accept jobs",
    body: "automatic. the scheduler routes work that fits your GPUs; failover handles the rest.",
  },
  {
    title: "Earn USDC",
    body: "paid per verified output, settled each epoch. utilization and reliability raise your share.",
  },
];

function ShareFeed() {
  const snap = useFeed();
  const rows = snap.items
    .filter(
      (i) =>
        (i.kind === "worker" &&
          (i.evt === "worker_online" || i.evt === "worker_recover" || i.evt === "worker_throttle")) ||
        (i.kind === "job" && (i.evt === "job_assign" || i.evt === "job_settle")) ||
        (i.kind === "economy" && i.evt === "reward_batch"),
    )
    .slice(0, 9);

  return (
    <div className="glass reticle flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="col-heading">provider activity · live</span>
        <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pos" aria-hidden />
          streaming
        </span>
      </div>
      <div className="flex-1 px-4 py-2">
        <AnimatePresence initial={false}>
          {rows.map((i) => {
            let line: React.ReactNode;
            if (i.kind === "worker") {
              line =
                i.evt === "worker_online" ? (
                  <>
                    <span className="text-ink">{i.entity.node}</span>{" "}
                    <span className="text-pos">joined</span>
                    <span className="text-mute"> · {i.entity.gpu} · verified</span>
                  </>
                ) : i.evt === "worker_recover" ? (
                  <>
                    <span className="text-ink">{i.entity.node}</span>{" "}
                    <span className="text-cyan">recovering</span>
                    <span className="text-mute"> · back in rotation</span>
                  </>
                ) : (
                  <>
                    <span className="text-ink">{i.entity.node}</span>{" "}
                    <span className="text-violet">throttling</span>
                    <span className="text-mute"> · jobs rerouting</span>
                  </>
                );
            } else if (i.kind === "job") {
              line =
                i.evt === "job_assign" ? (
                  <>
                    <span className="text-signal-bright">job accepted</span>
                    <span className="text-mute">
                      {" "}
                      · {i.entity.node} · {i.entity.type}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-pos">reward settled</span>
                    <span className="text-cyan"> +{i.entity.reward?.toFixed(2)} USDC</span>
                    <span className="text-mute"> · {i.entity.node}</span>
                  </>
                );
            } else {
              line = (
                <>
                  <span className="text-cyan">reward batch</span>
                  <span className="text-mute"> · distributing · partial visibility</span>
                </>
              );
            }
            return (
              <motion.p
                key={i.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.7, 0, 0.3, 1] }}
                className="border-b border-line py-2.5 font-mono text-[12px] last:border-b-0"
              >
                {line}
              </motion.p>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="border-t border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
        earnings scale with uptime · reliability · response consistency
      </div>
    </div>
  );
}

export default function ShareGpu() {
  return (
    <div className="mx-auto grid w-full max-w-[980px] gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
      {/* steps */}
      <div>
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.05}>
            <div className="grid grid-cols-[44px_1fr] gap-x-5">
              <div className="flex flex-col items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-strong bg-[rgba(8,9,14,0.8)] font-mono text-[11px] text-signal-bright">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="relative my-1 w-px flex-1 bg-line" aria-hidden>
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 font-mono text-[10px] leading-none text-signal">
                      ↓
                    </span>
                  </span>
                )}
              </div>
              <div className={i < STEPS.length - 1 ? "pb-7" : ""}>
                <h3 className="pt-1.5 font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">
                  {s.title}
                </h3>
                <p className="mt-1.5 font-mono text-[12.5px] leading-[1.7] text-mute">{s.body}</p>
                {s.code && (
                  <code className="mt-2.5 inline-block rounded-[6px] border border-line bg-[rgba(8,9,14,0.85)] px-3.5 py-2 font-mono text-[12px] text-cyan">
                    $ {s.code}
                  </code>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* live evidence */}
      <Reveal delay={0.15}>
        <ShareFeed />
      </Reveal>
    </div>
  );
}
