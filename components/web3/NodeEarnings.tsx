"use client";

import { useEffect, useState } from "react";
import { txStore } from "@/lib/tx";
import { shortAddr, useWallet, wallet } from "@/lib/wallet";

/**
 * The provider's payout desk: claimable USDC accruing live against the
 * connected wallet, claim moves it into the balance through the tx
 * lifecycle. The DePIN mechanic every supply side has.
 */
export default function NodeEarnings() {
  const w = useWallet();
  const [claimable, setClaimable] = useState(0);

  useEffect(() => {
    if (w.status !== "connected") return;
    setClaimable(wallet.claimable());
    const t = setInterval(() => setClaimable(wallet.claimable()), 1000);
    return () => clearInterval(t);
  }, [w.status, w.lastClaim]);

  return (
    <div className="glass reticle mb-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="col-heading">your earnings</span>
        {w.status === "connected" && (
          <span className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[#4ade80]" aria-hidden />
            <span className="tnum">{shortAddr(w.address)}</span>
          </span>
        )}
      </div>

      {w.status !== "connected" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <p className="font-mono text-[12px] leading-[1.6] text-mute">
            connect the wallet your worker settles to.
          </p>
          <button
            onClick={() => wallet.connect()}
            disabled={w.status === "connecting"}
            className="rounded-[2px] border border-line-strong px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink transition-colors hover:border-[rgba(255,255,255,0.5)] disabled:opacity-50"
          >
            {w.status === "connecting" ? "connecting…" : "connect wallet"}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-4">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-mute">
              claimable
            </p>
            <p className="tnum mt-1 font-display text-[26px] font-bold leading-none text-[#4ade80]">
              {claimable.toFixed(4)} <span className="text-[13px] text-ink">USDC</span>
            </p>
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
              accruing per verified output · wallet balance{" "}
              <span className="tnum text-ink">{w.usdc.toFixed(2)}</span>
            </p>
          </div>
          <button
            onClick={() => {
              const amt = wallet.claim();
              if (amt > 0) {
                txStore.submit(`claim ${amt.toFixed(2)} USDC`);
                setClaimable(0);
              }
            }}
            disabled={claimable < 0.01}
            className="rounded-[2px] bg-signal px-5 py-2.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#050505] transition-all duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] enabled:hover:shadow-[0_0_20px_rgba(255,255,255,0.28)] disabled:opacity-35"
          >
            claim
          </button>
        </div>
      )}
    </div>
  );
}
