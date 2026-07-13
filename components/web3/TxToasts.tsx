"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useTxs, txStore } from "@/lib/tx";

/** global pending → confirmed transaction toasts, bottom right */
export default function TxToasts() {
  const txs = useTxs();

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[300px] flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {txs.map((tx) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.35, ease: [0.7, 0, 0.3, 1] }}
            className="pointer-events-auto rounded-[8px] border border-line bg-[rgba(10,10,10,0.96)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-line px-3.5 py-2">
              <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em]">
                {tx.status === "pending" ? (
                  <>
                    <span
                      className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink"
                      aria-hidden
                    />
                    pending
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" aria-hidden />
                    <span className="text-[#4ade80]">confirmed</span>
                  </>
                )}
              </span>
              <button
                onClick={() => txStore.dismiss(tx.id)}
                aria-label="Dismiss"
                className="font-mono text-[12px] text-mute hover:text-ink"
              >
                ×
              </button>
            </div>
            <div className="px-3.5 py-2.5">
              <p className="font-mono text-[12px] text-ink">{tx.label}</p>
              <p className="mt-1 flex items-center justify-between font-mono text-[10.5px] text-mute">
                <span className="tnum">{tx.hash}</span>
                <Link
                  href="/explore"
                  className="font-semibold underline decoration-[rgba(255,255,255,0.45)] underline-offset-2 hover:decoration-white"
                >
                  explorer →
                </Link>
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
