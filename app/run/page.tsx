import type { Metadata } from "next";
import ActionShell from "@/components/ui/ActionShell";
import RunAI from "@/components/run/RunAI";

export const metadata: Metadata = {
  title: "Run AI — q0r",
  description:
    "Ask anything. Your prompt routes to a GPU on the q0r mesh, executes in a verified environment, and streams back.",
};

export default function RunPage() {
  return (
    <ActionShell
      chip="RUN AI"
      title={
        <>
          Ask anything<span className="text-signal">.</span>
        </>
      }
      sub="Your prompt routes to a GPU somewhere on the mesh, executes in a verified environment, and streams back. Same prompt, same model, same node — same answer."
    >
      <RunAI />
    </ActionShell>
  );
}
