"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { shortAddr, useWallet, wallet } from "@/lib/wallet";

/**
 * The dapp's front door: connect → address chip → session dropdown
 * (balances, copy, explorer, disconnect). Uses an injected provider
 * when one exists; otherwise mints a persistent local session wallet.
 */
export default function ConnectButton({ compact }: { compact?: boolean }) {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    wallet.init();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (w.status !== "connected") {
    return (
      <button
        onClick={() => wallet.connect()}
        disabled={w.status === "connecting"}
        className={`inline-flex items-center gap-2 rounded-[2px] border border-line-strong font-mono font-medium uppercase tracking-[0.14em] text-ink transition-all duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] hover:border-[rgba(255,255,255,0.55)] hover:shadow-[0_0_20px_rgba(255,255,255,0.14)] disabled:opacity-50 ${
          compact ? "px-4 py-2.5 text-[11px]" : "px-5 py-[10px] text-[12px]"
        }`}
      >
        {w.status === "connecting" ? "connecting…" : "connect wallet"}
      </button>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-2.5 rounded-[2px] border border-line-strong font-mono uppercase tracking-[0.1em] text-ink transition-colors duration-150 hover:border-[rgba(255,255,255,0.5)] ${
          compact ? "px-3.5 py-2.5 text-[11px]" : "px-4 py-[10px] text-[12px]"
        }`}
      >
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#4ade80]" aria-hidden />
        <span className="tnum">{shortAddr(w.address)}</span>
        <span aria-hidden className="text-[9px]">
          {open ? "▲" : "▼"}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.7, 0, 0.3, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-[264px] rounded-[8px] border border-line bg-[rgba(10,10,10,0.97)] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
                {w.source === "injected" ? "injected wallet" : "session wallet"}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em]">
                <span className="h-1 w-1 rounded-full bg-[#4ade80]" aria-hidden />
                q0r mainnet
              </span>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-baseline justify-between py-1">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-mute">
                  q0r
                </span>
                <span className="tnum font-mono text-[13px] font-semibold text-ink">
                  {w.q0r.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-mute">
                  usdc
                </span>
                <span className="tnum font-mono text-[13px] font-semibold text-ink">
                  {w.usdc.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-baseline justify-between py-1">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-mute">
                  staked
                </span>
                <span className="tnum font-mono text-[13px] font-semibold text-[#4ade80]">
                  {w.staked.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="border-t border-line px-2 py-2">
              <button
                onClick={() => {
                  if (w.address) {
                    navigator.clipboard?.writeText(w.address).catch(() => {});
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1400);
                  }
                }}
                className="block w-full rounded-[4px] px-2 py-2 text-left font-mono text-[11.5px] text-dim transition-colors hover:bg-[rgba(255,255,255,0.05)]"
              >
                {copied ? "copied ✓" : "copy address"}
              </button>
              <Link
                href="/explore"
                onClick={() => setOpen(false)}
                className="block w-full rounded-[4px] px-2 py-2 text-left font-mono text-[11.5px] text-dim transition-colors hover:bg-[rgba(255,255,255,0.05)]"
              >
                view in explorer →
              </Link>
              <button
                onClick={() => {
                  wallet.disconnect();
                  setOpen(false);
                }}
                className="block w-full rounded-[4px] px-2 py-2 text-left font-mono text-[11.5px] text-dim transition-colors hover:bg-[rgba(255,255,255,0.05)]"
              >
                disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
