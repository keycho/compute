"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PipelineTrace from "@/components/ui/PipelineTrace";
import Receipt from "@/components/ui/Receipt";
import { MODELS, PIPELINE, synthesize, type ModelKey, type RunMeta } from "@/lib/run";
import { saveReceipt } from "@/lib/receipts";
import { fmtRangeMs } from "@/lib/format";

interface Turn {
  id: number;
  prompt: string;
  model: ModelKey;
  modelId: string;
  text: string;
  shown: string;
  meta: RunMeta;
  stage: number;
  done: boolean;
  runtimeMs: number;
}

const SUGGESTIONS = [
  "explain how q0r verifies execution",
  "write a haiku about idle GPUs",
  "what should I benchmark before training a LoRA?",
  "plan a weekend project using open models",
];

export default function Execute() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ModelKey>("llama");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  const run = useCallback(
    (raw?: string) => {
      const p = (raw ?? prompt).trim();
      if (!p || busy) return;
      setPrompt("");
      setBusy(true);
      const { text, meta } = synthesize(p, model);
      const id = idRef.current++;
      const modelId = MODELS.find((m) => m.key === model)!.id;
      const started = performance.now();
      const turn: Turn = {
        id, prompt: p, model, modelId, text, shown: "", meta, stage: 0, done: false, runtimeMs: 0,
      };
      setTurns((t) => [...t, turn]);

      const patch = (fn: (t: Turn) => Partial<Turn>) =>
        setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...fn(t) } : t)));

      // pipeline: finding worker → assigned → executing → streaming
      const stageDelays = [500 + Math.random() * 700, 400 + Math.random() * 500, 500 + Math.random() * 800];
      let acc = 0;
      stageDelays.forEach((d, i) => {
        acc += d;
        timers.current.push(setTimeout(() => patch(() => ({ stage: i + 1 })), acc));
      });

      // streaming
      const words = text.split(/(\s+)/);
      timers.current.push(
        setTimeout(() => {
          patch(() => ({ stage: 3 }));
          let w = 0;
          const emit = () => {
            const take = 1 + Math.floor(Math.random() * 3);
            w = Math.min(words.length, w + take);
            const shown = words.slice(0, w).join("");
            if (w >= words.length) {
              // the receipt's runtime is the wall clock the user just watched
              const runtimeMs = performance.now() - started;
              saveReceipt({
                hash: meta.hash,
                kind: "inference",
                prompt: p,
                model: modelId,
                node: meta.node,
                gpu: meta.gpu,
                runtimeMs,
                costUsdc: meta.costUsdc,
              });
              patch(() => ({ shown, stage: 4, done: true, runtimeMs }));
              setBusy(false);
            } else {
              patch(() => ({ shown }));
              timers.current.push(setTimeout(emit, 26 + Math.random() * 64));
            }
          };
          emit();
        }, acc + 250),
      );
    },
    [prompt, model, busy],
  );

  return (
    <div className="mx-auto w-full max-w-[780px]">
      {/* transcript */}
      <div className="flex flex-col gap-8">
        <AnimatePresence initial={false}>
          {turns.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.7, 0, 0.3, 1] }}
            >
              <div className="mb-3 flex items-baseline gap-3">
                <span className="chip !text-[10.5px]">YOU</span>
                <p className="font-mono text-[14px] text-ink">{t.prompt}</p>
              </div>
              <div className="glass reticle p-5">
                <div className="mb-3 flex items-center justify-between gap-4 border-b border-line pb-3">
                  <span className="font-mono text-[11px] text-mute">{t.modelId}</span>
                  <PipelineTrace stages={PIPELINE} active={t.stage} node={t.meta.node} />
                </div>
                {t.shown ? (
                  <p className="whitespace-pre-wrap font-mono text-[13.5px] leading-[1.8] text-dim">
                    {t.shown}
                    {!t.done && (
                      <span className="ml-0.5 inline-block h-[14px] w-[7px] animate-pulse-dot bg-signal align-middle" />
                    )}
                  </p>
                ) : (
                  <p className="font-mono text-[12px] text-mute">
                    {t.stage < 1 ? "routing to the mesh…" : t.stage < 3 ? "worker warming…" : "…"}
                  </p>
                )}
                {t.done && (
                  <div className="mt-4 border-t border-line pt-3">
                    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
                      <span>
                        executed by <span className="text-signal">{t.meta.node}</span>
                      </span>
                      <span>{t.meta.gpu}</span>
                      <span className="text-pos">verified</span>
                      <span className="tnum">{fmtRangeMs(t.meta.latencyLo, t.meta.latencyHi)}/tok</span>
                      <span className="tnum text-cyan">{t.meta.costUsdc.toFixed(4)} USDC</span>
                    </div>
                    <Receipt
                      receipt={{
                        hash: t.meta.hash,
                        kind: "inference",
                        prompt: t.prompt,
                        model: t.modelId,
                        node: t.meta.node,
                        gpu: t.meta.gpu,
                        runtimeMs: t.runtimeMs,
                        costUsdc: t.meta.costUsdc,
                      }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* composer */}
      <div className={`glass reticle ${turns.length ? "mt-10" : ""}`}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              run();
            }
          }}
          placeholder="Ask anything..."
          rows={3}
          className="w-full resize-none bg-transparent px-5 pt-4 font-mono text-[14.5px] leading-[1.7] text-ink placeholder:text-mute focus:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Model">
              {MODELS.map((m) => (
                <button
                  key={m.key}
                  role="radio"
                  aria-checked={model === m.key}
                  onClick={() => setModel(m.key)}
                  className={`rounded-[2px] border px-3 py-1.5 font-mono text-[11px] transition-colors duration-150 ${
                    model === m.key
                      ? "border-[rgba(91,124,255,0.5)] bg-[rgba(91,124,255,0.1)] text-signal-bright"
                      : "border-line text-mute hover:text-dim"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute sm:inline">
              chat · reasoning · code — agents soon
            </span>
          </div>
          <button
            onClick={() => run()}
            disabled={busy || !prompt.trim()}
            className="rounded-[2px] bg-signal px-7 py-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[#050507] transition-all duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] enabled:hover:bg-signal-bright enabled:hover:shadow-[0_0_24px_rgba(91,124,255,0.4)] disabled:opacity-40"
          >
            {busy ? "Executing…" : "Execute"}
          </button>
        </div>
      </div>

      {/* suggestions */}
      {turns.length === 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => run(s)}
              className="rounded-[6px] border border-line px-3.5 py-2 font-mono text-[11.5px] text-mute transition-colors duration-150 hover:border-[rgba(91,124,255,0.4)] hover:text-dim"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
