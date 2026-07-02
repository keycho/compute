import type { Metadata } from "next";
import ExplorerStage from "@/components/explorer/ExplorerStage";

export const metadata: Metadata = {
  title: "Explorer — q0r",
  description:
    "The live view of the compute mesh. Blocks, jobs, workers, and settlement flows across the network in real time.",
};

export default function ExplorePage() {
  return <ExplorerStage />;
}
