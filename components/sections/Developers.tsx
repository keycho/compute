"use client";

import { useEffect, useState } from "react";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Developer surface: capability ledger on the left, a live session on
 * the right. Snippets print in line by line on tab change, the way a
 * terminal would.
 */

type Tok = [cls: string, text: string];
type Line = Tok[];

const C = {
  cmt: "text-mute",
  key: "text-violet",
  str: "text-cyan",
  val: "text-signal-bright",
  ink: "text-dim",
  fn: "text-ink",
};

const SNIPPETS: Record<string, { label: string; lines: Line[] }> = {
  rest: {
    label: "curl",
    lines: [
      [[C.cmt, "# submit a workload to the mesh"]],
      [
        [C.fn, "curl"],
        [C.ink, " -X POST https://api.q0r.network/v1/jobs \\"],
      ],
      [
        [C.ink, "  -d '{ "],
        [C.str, '"image"'],
        [C.ink, ": "],
        [C.str, '"ghcr.io/acme/train:latest"'],
        [C.ink, ","],
      ],
      [
        [C.ink, "        "],
        [C.str, '"gpu"'],
        [C.ink, ": "],
        [C.str, '"h100"'],
        [C.ink, ", "],
        [C.str, '"replicas"'],
        [C.ink, ": "],
        [C.val, "8"],
        [C.ink, " }'"],
      ],
      [[C.ink, ""]],
      [[C.key, "{"]],
      [
        [C.str, '  "job"'],
        [C.ink, ": "],
        [C.str, '"job_0x6c1d94"'],
        [C.ink, ","],
      ],
      [
        [C.str, '  "status"'],
        [C.ink, ": "],
        [C.str, '"routed"'],
        [C.ink, ","],
      ],
      [
        [C.str, '  "providers"'],
        [C.ink, ": ["],
        [C.str, '"nd-9417"'],
        [C.ink, ", "],
        [C.str, '"nd-a61c"'],
        [C.ink, ", …],"],
      ],
      [
        [C.str, '  "routing_ms"'],
        [C.ink, ": "],
        [C.val, "94"],
      ],
      [[C.key, "}"]],
    ],
  },
  ws: {
    label: "websocket",
    lines: [
      [[C.cmt, "// stream execution state for a job"]],
      [
        [C.key, "const"],
        [C.ink, " ws = "],
        [C.key, "new"],
        [C.fn, " WebSocket"],
        [C.ink, "("],
        [C.str, '"wss://feed.q0r.network/v1"'],
        [C.ink, ");"],
      ],
      [[C.ink, ""]],
      [
        [C.ink, "ws."],
        [C.fn, "send"],
        [C.ink, "(JSON."],
        [C.fn, "stringify"],
        [C.ink, "({"],
      ],
      [
        [C.ink, "  op: "],
        [C.str, '"subscribe"'],
        [C.ink, ","],
      ],
      [
        [C.ink, "  channels: ["],
        [C.str, '"jobs:job_0x6c1d94"'],
        [C.ink, ", "],
        [C.str, '"telemetry:h100"'],
        [C.ink, "],"],
      ],
      [[C.ink, "}));"]],
      [[C.ink, ""]],
      [
        [C.ink, "ws.onmessage = (e) => "],
        [C.fn, "track"],
        [C.ink, "(JSON."],
        [C.fn, "parse"],
        [C.ink, "(e.data));"],
      ],
      [[C.cmt, "// routed → executing → verified → settled"]],
    ],
  },
  sdk: {
    label: "typescript",
    lines: [
      [
        [C.key, "import"],
        [C.ink, " { Q0r } "],
        [C.key, "from"],
        [C.str, ' "@q0r/sdk"'],
        [C.ink, ";"],
      ],
      [[C.ink, ""]],
      [
        [C.key, "const"],
        [C.ink, " q0r = "],
        [C.key, "new"],
        [C.fn, " Q0r"],
        [C.ink, "({ signer });"],
      ],
      [[C.ink, ""]],
      [[C.cmt, "// run inference across the mesh"]],
      [
        [C.key, "const"],
        [C.ink, " result = "],
        [C.key, "await"],
        [C.ink, " q0r.jobs."],
        [C.fn, "run"],
        [C.ink, "({"],
      ],
      [
        [C.ink, "  image: "],
        [C.str, '"ghcr.io/acme/serve:latest"'],
        [C.ink, ","],
      ],
      [
        [C.ink, "  gpu: "],
        [C.str, '"b200"'],
        [C.ink, ","],
      ],
      [
        [C.ink, "  verify: "],
        [C.str, '"attested"'],
        [C.ink, ","],
      ],
      [[C.ink, "});"]],
      [
        [C.cmt, "// result.proof — verifiable by anyone"],
      ],
    ],
  },
  graph: {
    label: "subgraph",
    lines: [
      [[C.cmt, "# network history, by epoch"]],
      [
        [C.key, "query"],
        [C.fn, " Epochs"],
        [C.ink, " {"],
      ],
      [
        [C.ink, "  epochs("],
        [C.fn, "orderBy"],
        [C.ink, ": "],
        [C.val, "index"],
        [C.ink, ", "],
        [C.fn, "orderDirection"],
        [C.ink, ": "],
        [C.val, "desc"],
        [C.ink, ") {"],
      ],
      [[C.ink, "    "], [C.fn, "verifiedJobs"]],
      [[C.ink, "    "], [C.fn, "activeProviders"]],
      [[C.ink, "    "], [C.fn, "rewardsSettled"]],
      [[C.ink, "    "], [C.fn, "utilization"]],
      [[C.ink, "  }"]],
      [[C.ink, "}"]],
    ],
  },
};

const CAPABILITIES = [
  {
    title: "Permissionless APIs",
    body: "Any application can submit workloads. No accounts to provision — a signed request is the only requirement.",
  },
  {
    title: "Verifiable execution",
    body: "Every job returns a proof. Results are checkable by anyone, from genesis.",
  },
  {
    title: "Streaming telemetry",
    body: "WebSocket firehose for job states, provider health, routing, and capacity.",
  },
  {
    title: "SDKs",
    body: "Typed clients for TypeScript, Python, and Rust track the protocol release-for-release.",
  },
  {
    title: "Subgraphs",
    body: "Indexed history for every job, provider, and epoch since deployment.",
  },
];

export default function Developers() {
  const [tab, setTab] = useState<keyof typeof SNIPPETS>("rest");
  const [printed, setPrinted] = useState(0);
  const lines = SNIPPETS[tab].lines;

  useEffect(() => {
    setPrinted(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPrinted(SNIPPETS[tab].lines.length);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i++;
      setPrinted(i);
      if (i >= SNIPPETS[tab].lines.length) clearInterval(t);
    }, 55);
    return () => clearInterval(t);
  }, [tab]);

  return (
    <section className="hairline-t relative py-[clamp(110px,14vh,170px)]" id="developers">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,6,6,0.66), rgba(6,6,6,0.45) 50%, rgba(6,6,6,0.7))",
        }}
      />
      <div className="relative">
        <SectionHeader
          chip="DEVELOPERS"
          title={
            <>
              The network is
              <br />
              an API<span className="text-signal">.</span>
            </>
          }
          body="Everything the explorer shows, the protocol exposes. State is free to read; execution is a signed request away."
        />

        <div className="container-x mt-20 grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col">
            {CAPABILITIES.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.06}>
                <div className="group border-b border-line py-6 first:border-t">
                  <h3 className="col-heading !text-dim transition-colors duration-300 group-hover:!text-signal-bright">
                    {c.title}
                  </h3>
                  <p className="mt-2.5 font-mono text-[13px] leading-[1.7] text-mute">{c.body}</p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.3}>
              <a
                href="#developers"
                className="mt-8 inline-flex items-center gap-2 font-mono text-[12.5px] uppercase tracking-[0.13em] text-signal transition-colors duration-150 hover:text-signal-bright"
              >
                Read the documentation <span aria-hidden>→</span>
              </a>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="glass reticle overflow-hidden">
              {/* window chrome */}
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <div className="flex gap-1.5" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.12)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.12)]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,255,255,0.55)]" />
                </div>
                <div className="flex gap-1">
                  {(Object.keys(SNIPPETS) as Array<keyof typeof SNIPPETS>).map((k) => (
                    <button
                      key={k}
                      onClick={() => setTab(k)}
                      className={`rounded-[2px] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors duration-150 ${
                        tab === k
                          ? "bg-[rgba(255,255,255,0.12)] text-signal-bright"
                          : "text-mute hover:text-dim"
                      }`}
                    >
                      {SNIPPETS[k].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* code */}
              <div className="min-h-[380px] p-6 font-mono text-[13px] leading-[1.85]">
                {lines.slice(0, printed).map((line, i) => (
                  <div key={`${tab}-${i}`} className="flex">
                    <span className="mr-5 w-5 select-none text-right text-[11px] leading-[1.85em] text-mute">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="whitespace-pre-wrap break-all">
                      {line.map(([cls, text], j) => (
                        <span key={j} className={cls}>
                          {text}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
                {printed >= lines.length && (
                  <div className="flex">
                    <span className="mr-5 w-5" />
                    <span className="mt-1 inline-block h-[15px] w-[8px] animate-pulse-dot bg-signal" aria-hidden />
                  </div>
                )}
              </div>

              {/* status bar */}
              <div className="flex items-center justify-between border-t border-line px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                <span>api.q0r.network</span>
                <span>reference examples</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
