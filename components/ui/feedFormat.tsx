import type { FeedItem, JobItem, JobStatus } from "@/lib/feed";

export const STATUS_COLOR: Record<JobStatus, string> = {
  running: "text-signal-bright",
  completed: "text-pos",
  rerouted: "text-violet",
  failed: "text-neg",
  "pending finalization": "text-mute",
};

export function jobMeta(j: JobItem): string {
  return `${j.type} · ${j.model}`;
}

export function itemTitle(i: FeedItem): string {
  if (i.kind === "job") return `${i.hash} → ${i.node}`;
  if (i.kind === "worker") return `${i.node} · ${i.region}`;
  return `${i.type} · ${i.amount.toLocaleString("en-US")} ${i.unit}`;
}

export function itemDetail(i: FeedItem): string {
  if (i.kind === "job") {
    if (i.status === "running")
      return `${jobMeta(i)} · ${Math.round(i.latencyNow)}ms · ${Math.round(i.progress)}%`;
    if (i.status === "completed") return `${jobMeta(i)} · $${i.reward?.toFixed(2)} USDC`;
    if (i.status === "rerouted") return `${jobMeta(i)} · ${i.rerouteReason} → ${i.node}`;
    if (i.status === "failed") return `${jobMeta(i)} · retry scheduled`;
    return `${jobMeta(i)} · settling`;
  }
  if (i.kind === "worker")
    return i.status === "unstable" ? `unstable · ${i.note}` : `online · load ~${Math.round(i.loadNow)}%`;
  return `${i.source} · ${i.state}`;
}

export function itemStatusLabel(i: FeedItem): { label: string; cls: string } {
  if (i.kind === "job") return { label: i.status, cls: STATUS_COLOR[i.status] };
  if (i.kind === "worker")
    return i.status === "unstable"
      ? { label: "unstable", cls: "text-neg" }
      : { label: i.status, cls: "text-pos" };
  return i.type === "slash"
    ? { label: "slash", cls: "text-neg" }
    : { label: i.type, cls: i.state === "pending" ? "text-mute" : "text-cyan" };
}
