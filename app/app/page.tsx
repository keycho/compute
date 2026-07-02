import type { Metadata } from "next";
import ConsoleStage from "@/components/console/ConsoleStage";

export const metadata: Metadata = {
  title: "Network Console — Compute Markets",
  description:
    "The live view of the compute mesh. Providers, jobs, and settlement flows across the network in real time.",
};

export default function AppPage() {
  return <ConsoleStage />;
}
