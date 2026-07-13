"use client";

import { useState } from "react";
import { txStore } from "@/lib/tx";
import { useWallet, wallet } from "@/lib/wallet";

/**
 * The staking desk: connect-gated amount input with max, stake/unstake
 * actions that move real (session) balances and report through the tx
 * toast lifecycle. Position and routing weight update live.
 */
export default function StakeWidget() {
  const w = useWallet();
  const [amount, setAmount] = useState("");

  const parsed = Number.parseFloat(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;

  const act = (kind: "stake" | "unstake") => {
    if (!valid) return;
    const ok = kind === "stake" ? wallet.stake(parsed) : wallet.unstake(parsed);
    if (ok) {
      txStore.submit(
        `${kind} ${parsed.toLocaleString("en-US", { maximumFractionDigits: 2 })} Q0R`,
      );
      setAmount("");
    }
  };

  return (
    <div className="glass reticle overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="col-heading">stake q0r</span>
        {w.status === "connected" && (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
            balance{" "}
            <span className="tnum text-ink">
              {w.q0r.toLocaleString("en-US", { maximumFractionDigits: 2 })}
            </span>
          </span>
        )}
      </div>

      {w.status !== "connected" ? (
        <div className="flex flex-col items-start gap-3 px-5 py-6">
          <p className="font-mono text-[12.5px] leading-[1.7] text-mute">
            connect a wallet to stake. your tokens never leave your custody —
            only stake weight is read by the network.
          </p>
          <button
            onClick={() => wallet.connect()}
            disabled={w.status === "connecting"}
            className="rounded-[2px] bg-signal px-6 py-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[#050505] transition-all duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] hover:shadow-[0_0_24px_rgba(255,255,255,0.3)] disabled:opacity-50"
          >
            {w.status === "connecting" ? "connecting…" : "connect wallet"}
          </button>
        </div>
      ) : (
        <>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 rounded-[6px] border border-line bg-[rgba(6,6,6,0.6)] px-3 py-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="0.00"
                aria-label="Amount of Q0R"
                className="tnum w-full bg-transparent font-mono text-[15px] text-ink placeholder:text-[rgba(255,255,255,0.4)] focus:outline-none"
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-mute">
                q0r
              </span>
              <button
                onClick={() => setAmount(String(w.q0r))}
                className="rounded-[3px] border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-mute hover:text-ink"
              >
                max
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => act("stake")}
                disabled={!valid || parsed > w.q0r}
                className="rounded-[2px] bg-signal px-4 py-2.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#050505] transition-all duration-[450ms] ease-[cubic-bezier(0.7,0,0.3,1)] enabled:hover:shadow-[0_0_20px_rgba(255,255,255,0.28)] disabled:opacity-35"
              >
                stake
              </button>
              <button
                onClick={() => act("unstake")}
                disabled={!valid || parsed > w.staked}
                className="rounded-[2px] border border-line-strong px-4 py-2.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.14em] text-ink transition-colors duration-150 enabled:hover:border-[rgba(255,255,255,0.5)] disabled:opacity-35"
              >
                unstake
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-line px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute">
            <span>
              your stake{" "}
              <span className="tnum font-semibold text-[#4ade80]">
                {w.staked.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>
            </span>
            <span>
              routing weight{" "}
              <span className="tnum text-ink">
                {w.staked > 0 ? `+${Math.log10(1 + w.staked).toFixed(2)}` : "0.00"}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
