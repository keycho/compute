import type { Metadata } from "next";
import ActionShell from "@/components/ui/ActionShell";
import ShareGpu from "@/components/share/ShareGpu";

export const metadata: Metadata = {
  title: "Share GPU — q0r",
  description:
    "Five steps from idle GPU to USDC income. Install the worker, join the mesh, and the network routes work to your hardware.",
};

export default function SharePage() {
  return (
    <ActionShell
      chip="SHARE GPU"
      title={
        <>
          Share your GPU<span className="text-signal">.</span>
        </>
      }
      sub="Five steps, one afternoon. Your hardware earns whenever the network has work that fits it — the feed on the right is that happening, right now."
    >
      <ShareGpu />
    </ActionShell>
  );
}
