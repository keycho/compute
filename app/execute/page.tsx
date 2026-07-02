import type { Metadata } from "next";
import ActionShell from "@/components/ui/ActionShell";
import Execute from "@/components/execute/Execute";

export const metadata: Metadata = {
  title: "Execute — q0r",
  description:
    "Chat models, reasoning, code. Your prompt routes to a GPU on the q0r mesh, executes in a verified environment, and streams back with a receipt.",
};

export default function ExecutePage() {
  return (
    <ActionShell
      chip="EXECUTE"
      title={
        <>
          Execute<span className="text-signal">.</span>
        </>
      }
      sub="Chat models, reasoning, code. Your prompt routes to a GPU somewhere on the mesh, executes in a verified environment, and streams back — every answer carries a receipt that opens in the explorer."
    >
      <Execute />
    </ActionShell>
  );
}
