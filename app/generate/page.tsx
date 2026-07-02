import type { Metadata } from "next";
import ActionShell from "@/components/ui/ActionShell";
import Generate from "@/components/generate/Generate";

export const metadata: Metadata = {
  title: "Generate Images — q0r",
  description:
    "Prompt in, four verified variations out. Image generation runs on GPUs across the q0r mesh.",
};

export default function GeneratePage() {
  return (
    <ActionShell
      chip="GENERATE IMAGES"
      title={
        <>
          Generate images<span className="text-signal">.</span>
        </>
      }
      sub="Prompt in, four variations out. Each render executes on a different node and returns with its seed — re-run the seed, get the same frame."
    >
      <Generate />
    </ActionShell>
  );
}
