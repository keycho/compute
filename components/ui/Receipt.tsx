"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { Receipt as ReceiptData } from "@/lib/receipts";

/**
 * The execution receipt: proof that a job ran, attached to the thing it
 * produced. Collapsed it is one quiet line; expanded it is the block
 * header — job hash, worker, model, gpu, runtime, cost — and "view
 * block" opens the same job in the explorer. This is how the consumer
 * surfaces and the protocol stay one product.
 */

function fmtRuntime(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function Row({ k, v, cls }: { k: string; v: React.ReactNode; cls?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-[3.5px]">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">{k}</span>
      <span className={`text-right font-mono text-[12px] ${cls ?? "text-dim"}`}>{v}</span>
    </div>
  );
}

export default function Receipt({
  receipt,
  compact,
}: {
  receipt: ReceiptData;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={compact ? "" : "mt-3"}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute transition-colors duration-150 hover:text-signal-bright"
      >
        <span className="text-signal">▦</span>
        execution receipt
        <span aria-hidden className="text-[9px]">
          {open ? "▲" : "▼"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.7, 0, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2.5 rounded-[8px] border border-line bg-[rgba(12,12,12,0.88)]">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink">
                  execution receipt
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-pos">
                  <span className="h-1 w-1 rounded-full bg-pos" aria-hidden />
                  verified
                </span>
              </div>
              <div className="px-4 py-2.5">
                <Row k="job" v={receipt.hash} cls="text-signal" />
                <Row k="worker" v={receipt.node} cls="text-ink" />
                <Row k="model" v={receipt.model} />
                <Row k="gpu" v={receipt.gpu} />
                <Row k="runtime" v={fmtRuntime(receipt.runtimeMs)} />
                <Row k="cost" v={`${receipt.costUsdc.toFixed(4)} USDC`} cls="text-cyan" />
              </div>
              <div className="border-t border-line px-4 py-2.5">
                <Link
                  href={`/explore?block=${receipt.hash}`}
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-signal underline decoration-[rgba(255,255,255,0.45)] underline-offset-4 transition-colors duration-150 hover:decoration-white"
                >
                  view block →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
