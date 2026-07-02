"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PipelineTrace from "@/components/ui/PipelineTrace";
import Receipt from "@/components/ui/Receipt";
import { PIPELINE } from "@/lib/run";
import { saveReceipt } from "@/lib/receipts";
import {
  ASPECTS,
  STYLES,
  genMeta,
  paint,
  type AspectKey,
  type StyleKey,
} from "@/lib/genart";

const IMAGE_MODEL = "flux.1-schnell";

// creation media — images ship today, the rest lands on the same pipeline
const MEDIA = [
  { key: "images", live: true },
  { key: "video", live: false },
  { key: "audio", live: false },
] as const;

interface Gen {
  id: number;
  prompt: string;
  style: StyleKey;
  aspect: AspectKey;
  stage: number;
  ready: number; // how many variations have landed
  node: string;
}

function Variation({
  prompt,
  style,
  aspect,
  variation,
  visible,
}: {
  prompt: string;
  style: StyleKey;
  aspect: AspectKey;
  variation: number;
  visible: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const meta = genMeta(prompt, style, aspect, variation);

  useEffect(() => {
    if (visible && ref.current) {
      paint(ref.current, prompt, style, aspect, variation);
      saveReceipt({
        hash: meta.hash,
        kind: "image",
        prompt,
        model: IMAGE_MODEL,
        node: meta.node,
        gpu: "1× RTX 5090",
        runtimeMs: meta.ms,
        costUsdc: meta.costUsdc,
      });
    }
    // meta is derived deterministically from the same inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, prompt, style, aspect, variation]);

  const ar = ASPECTS.find((a) => a.key === aspect)!;

  return (
    <figure className="overflow-hidden rounded-[10px] border border-line bg-[rgba(8,9,14,0.8)]">
      <div className="relative w-full" style={{ aspectRatio: `${ar.w} / ${ar.h}` }}>
        {visible ? (
          <motion.canvas
            ref={ref}
            initial={{ opacity: 0, filter: "blur(14px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: [0.7, 0, 0.3, 1] }}
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <div className="absolute inset-0 animate-pulse-dot bg-[rgba(91,124,255,0.05)]" />
        )}
      </div>
      <figcaption className="flex items-center justify-between border-t border-line px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-mute">
        <span>
          <span className="text-signal">{meta.node}</span> ·{" "}
          {visible ? <span className="text-pos">verified</span> : "executing"}
        </span>
        <span className="tnum">seed {meta.seed.toString(16)}</span>
      </figcaption>
      {visible && (
        <div className="border-t border-line px-3 py-2">
          <Receipt
            compact
            receipt={{
              hash: meta.hash,
              kind: "image",
              prompt,
              model: IMAGE_MODEL,
              node: meta.node,
              gpu: "1× RTX 5090",
              runtimeMs: meta.ms,
              costUsdc: meta.costUsdc,
            }}
          />
        </div>
      )}
    </figure>
  );
}

export default function Create() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<StyleKey>("aurora");
  const [aspect, setAspect] = useState<AspectKey>("1:1");
  const [gens, setGens] = useState<Gen[]>([]);
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const generate = useCallback(() => {
    const p = prompt.trim();
    if (!p || busy) return;
    setBusy(true);
    const id = idRef.current++;
    const meta = genMeta(p, style, aspect, 0);
    setGens((g) => [{ id, prompt: p, style, aspect, stage: 0, ready: 0, node: meta.node }, ...g].slice(0, 4));

    const patch = (fn: (g: Gen) => Partial<Gen>) =>
      setGens((gs) => gs.map((g) => (g.id === id ? { ...g, ...fn(g) } : g)));

    // finding worker → assigned → executing → streaming → verified
    let acc = 0;
    [600 + Math.random() * 700, 450 + Math.random() * 500, 700 + Math.random() * 900].forEach(
      (d, i) => {
        acc += d;
        timers.current.push(setTimeout(() => patch(() => ({ stage: i + 1 })), acc));
      },
    );
    // variations land one at a time while "streaming"
    for (let v = 0; v < 4; v++) {
      acc += 650 + Math.random() * 850;
      const isLast = v === 3;
      timers.current.push(
        setTimeout(() => {
          patch((g) => ({ ready: g.ready + 1, stage: isLast ? 4 : 3 }));
          if (isLast) setBusy(false);
        }, acc),
      );
    }
  }, [prompt, style, aspect, busy]);

  return (
    <div className="mx-auto w-full max-w-[780px]">
      {/* composer */}
      <div className="glass reticle">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              generate();
            }
          }}
          placeholder="Prompt... a signal blooming through a dark lattice"
          rows={2}
          className="w-full resize-none bg-transparent px-5 pt-4 font-mono text-[14.5px] leading-[1.7] text-ink placeholder:text-mute focus:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Medium">
              {MEDIA.map((m) => (
                <button
                  key={m.key}
                  role="radio"
                  aria-checked={m.live}
                  disabled={!m.live}
                  title={m.live ? undefined : "coming to the same pipeline"}
                  className={`rounded-[2px] border px-3 py-1.5 font-mono text-[11px] ${
                    m.live
                      ? "border-[rgba(103,232,249,0.4)] bg-[rgba(103,232,249,0.07)] text-cyan"
                      : "cursor-default border-line text-mute opacity-60"
                  }`}
                >
                  {m.key}
                  {!m.live && <span className="ml-1.5 text-[9px] uppercase">soon</span>}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Style">
              {STYLES.map((s) => (
                <button
                  key={s.key}
                  role="radio"
                  aria-checked={style === s.key}
                  onClick={() => setStyle(s.key)}
                  className={`rounded-[2px] border px-3 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                    style === s.key
                      ? "border-[rgba(139,92,246,0.55)] bg-[rgba(139,92,246,0.12)] text-violet"
                      : "border-line text-mute hover:text-dim"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Aspect ratio">
              {ASPECTS.map((a) => (
                <button
                  key={a.key}
                  role="radio"
                  aria-checked={aspect === a.key}
                  onClick={() => setAspect(a.key)}
                  className={`rounded-[2px] border px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                    aspect === a.key
                      ? "border-[rgba(91,124,255,0.5)] bg-[rgba(91,124,255,0.1)] text-signal-bright"
                      : "border-line text-mute hover:text-dim"
                  }`}
                >
                  {a.key}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={generate}
            disabled={busy || !prompt.trim()}
            className="rounded-[2px] bg-signal px-7 py-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[#050507] transition-all duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] enabled:hover:bg-signal-bright enabled:hover:shadow-[0_0_24px_rgba(91,124,255,0.4)] disabled:opacity-40"
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>

      {/* results */}
      <AnimatePresence initial={false}>
        {gens.map((g) => (
          <motion.section
            key={g.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.7, 0, 0.3, 1] }}
            className="mt-8"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[12.5px] text-dim">
                <span className="text-mute">“</span>
                {g.prompt}
                <span className="text-mute">”</span>{" "}
                <span className="text-[11px] text-mute">
                  · {g.style} · {g.aspect}
                </span>
              </p>
              <PipelineTrace stages={PIPELINE} active={g.stage} node={g.node} />
            </div>
            <div className={`grid items-start gap-3 ${g.aspect === "9:16" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
              {[0, 1, 2, 3].map((v) => (
                <Variation
                  key={v}
                  prompt={g.prompt}
                  style={g.style}
                  aspect={g.aspect}
                  variation={v}
                  visible={g.ready > v}
                />
              ))}
            </div>
          </motion.section>
        ))}
      </AnimatePresence>

      {gens.length === 0 && (
        <p className="mt-6 font-mono text-[12px] text-mute">
          four variations per run · deterministic per seed · every frame comes with a receipt
        </p>
      )}
    </div>
  );
}
