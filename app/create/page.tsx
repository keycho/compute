import type { Metadata } from "next";
import ActionShell from "@/components/ui/ActionShell";
import Create from "@/components/create/Create";

export const metadata: Metadata = {
  title: "Create — q0r",
  description:
    "Images today, video and audio on the same pipeline. Prompt in, four verified variations out, each with its seed and a receipt.",
};

export default function CreatePage() {
  return (
    <ActionShell
      chip="CREATE"
      title={
        <>
          Create<span className="text-signal">.</span>
        </>
      }
      sub="Prompt in, four variations out. Each render executes on a different node and returns with its seed and a receipt — re-run the seed, get the same frame. Images today; video and audio land on the same pipeline."
    >
      <Create />
    </ActionShell>
  );
}
