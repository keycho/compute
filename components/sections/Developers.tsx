"use client";

import { useEffect, useState } from "react";
import Reveal from "@/components/ui/Reveal";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Developer surface: capability ledger on the left, a live terminal on
 * the right. Snippets print in line by line on tab change, the way a
 * session would.
 */

type Tok = [cls: string, text: string];
type Line = Tok[];

const C = {
  cmt: "text-faint",
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
      [[C.cmt, "# fetch the live order book for H100-PERP"]],
      [
        [C.fn, "curl"],
        [C.ink, " https://api.computemarkets.xyz/v1/book/"],
        [C.val, "H100-PERP"],
      ],
      [[C.ink, ""]],
      [[C.key, "{"]],
      [
        [C.str, '  "symbol"'],
        [C.ink, ": "],
        [C.str, '"H100-PERP"'],
        [C.ink, ","],
      ],
      [
        [C.str, '  "mid"'],
        [C.ink, ": "],
        [C.val, "2.4871"],
        [C.ink, ","],
      ],
      [
        [C.str, '  "funding_8h"'],
        [C.ink, ": "],
        [C.val, "0.000042"],
        [C.ink, ","],
      ],
      [
        [C.str, '  "open_interest"'],
        [C.ink, ": "],
        [C.val, "63412887.21"],
        [C.ink, ","],
      ],
      [
        [C.str, '  "bids"'],
        [C.ink, ": [["],
        [C.val, "2.4863"],
        [C.ink, ", "],
        [C.val, "1840"],
        [C.ink, "], …],"],
      ],
      [
        [C.str, '  "asks"'],
        [C.ink, ": [["],
        [C.val, "2.4880"],
        [C.ink, ", "],
        [C.val, "1655"],
        [C.ink, "], …]"],
      ],
      [[C.key, "}"]],
    ],
  },
  ws: {
    label: "websocket",
    lines: [
      [[C.cmt, "// stream every fill on the training index"]],
      [
        [C.key, "const"],
        [C.ink, " ws = "],
        [C.key, "new"],
        [C.fn, " WebSocket"],
        [C.ink, "("],
        [C.str, '"wss://feed.computemarkets.xyz/v1"'],
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
        [C.str, '"fills:TRAIN-IDX"'],
        [C.ink, ", "],
        [C.str, '"funding:*"'],
        [C.ink, "],"],
      ],
      [[C.ink, "}));"]],
      [[C.ink, ""]],
      [
        [C.ink, "ws.onmessage = (e) => "],
        [C.fn, "settle"],
        [C.ink, "(JSON."],
        [C.fn, "parse"],
        [C.ink, "(e.data));"],
      ],
      [
        [C.cmt, "// ~9,400 msgs/min at current network load"],
      ],
    ],
  },
  sdk: {
    label: "typescript",
    lines: [
      [
        [C.key, "import"],
        [C.ink, " { ComputeMarkets } "],
        [C.key, "from"],
        [C.str, ' "@computemarkets/sdk"'],
        [C.ink, ";"],
      ],
      [[C.ink, ""]],
      [
        [C.key, "const"],
        [C.ink, " cm = "],
        [C.key, "new"],
        [C.fn, " ComputeMarkets"],
        [C.ink, "({ signer });"],
      ],
      [[C.ink, ""]],
      [[C.cmt, "// open a 5x long on B200 capacity"]],
      [
        [C.key, "const"],
        [C.ink, " position = "],
        [C.key, "await"],
        [C.ink, " cm.perps."],
        [C.fn, "open"],
        [C.ink, "({"],
      ],
      [
        [C.ink, "  market: "],
        [C.str, '"B200-PERP"'],
        [C.ink, ","],
      ],
      [
        [C.ink, "  side: "],
        [C.str, '"long"'],
        [C.ink, ","],
      ],
      [
        [C.ink, "  size: "],
        [C.val, "2_500"],
        [C.ink, ","],
      ],
      [
        [C.ink, "  leverage: "],
        [C.val, "5"],
        [C.ink, ","],
      ],
      [[C.ink, "});"]],
    ],
  },
  graph: {
    label: "subgraph",
    lines: [
      [[C.cmt, "# hourly settled volume, by market"]],
      [
        [C.key, "query"],
        [C.fn, " Volume"],
        [C.ink, " {"],
      ],
      [
        [C.ink, "  marketHourDatas("],
        [C.fn, "orderBy"],
        [C.ink, ": "],
        [C.val, "hour"],
        [C.ink, ", "],
        [C.fn, "orderDirection"],
        [C.ink, ": "],
        [C.val, "desc"],
        [C.ink, ") {"],
      ],
      [[C.ink, "    market { "], [C.fn, "symbol"], [C.ink, " }"]],
      [[C.ink, "    "], [C.fn, "volumeUsd"]],
      [[C.ink, "    "], [C.fn, "openInterestUsd"]],
      [[C.ink, "    "], [C.fn, "fundingRate"]],
      [[C.ink, "  }"]],
      [[C.ink, "}"]],
    ],
  },
};

const CAPABILITIES = [
  {
    title: "Permissionless APIs",
    body: "Every market endpoint is public. No keys for reads, signatures for writes.",
  },
  {
    title: "On-chain settlement",
    body: "Fills commit with validity proofs. State is verifiable from genesis.",
  },
  {
    title: "Streaming feeds",
    body: "WebSocket firehose for fills, books, funding, and oracle updates.",
  },
  {
    title: "SDKs",
    body: "Typed clients for TypeScript, Python, and Rust track the protocol release-for-release.",
  },
  {
    title: "Subgraphs",
    body: "Indexed history for every market, position, and epoch since deployment.",
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
    <section className="hairline-t py-[clamp(110px,14vh,170px)]" id="developers">
      <SectionHeader
        chip="DEVELOPERS"
        title={
          <>
            The exchange is
            <br />
            an API<span className="text-signal">.</span>
          </>
        }
        body="Everything the interface can do, the protocol exposes. Market data is free to read; execution is a signed message away."
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
                <span className="h-2.5 w-2.5 rounded-full bg-[rgba(235,240,255,0.12)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[rgba(235,240,255,0.12)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[rgba(91,124,255,0.55)]" />
              </div>
              <div className="flex gap-1">
                {(Object.keys(SNIPPETS) as Array<keyof typeof SNIPPETS>).map((k) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    className={`rounded-[2px] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors duration-150 ${
                      tab === k
                        ? "bg-[rgba(91,124,255,0.12)] text-signal-bright"
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
                  <span className="mr-5 w-5 select-none text-right text-[11px] leading-[1.85em] text-faint">
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
            <div className="flex items-center justify-between border-t border-line px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
              <span>api.computemarkets.xyz</span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-pos" aria-hidden />
                200 · 38ms
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
