import type { Metadata } from "next";
import ActionShell from "@/components/ui/ActionShell";
import SupplyGpu from "@/components/supply/SupplyGpu";

export const metadata: Metadata = {
  title: "Supply — q0r",
  description:
    "Download the worker, join the network, start earning. Five steps from idle GPU to USDC income.",
};

export default function SupplyPage() {
  return (
    <ActionShell
      chip="SUPPLY"
      title={
        <>
          Supply GPUs<span className="text-signal">.</span>
        </>
      }
      sub="Download the worker, join the network, start earning. Your hardware gets work whenever the network has jobs that fit it — the feed on the right is that happening, right now."
    >
      <SupplyGpu />
    </ActionShell>
  );
}
