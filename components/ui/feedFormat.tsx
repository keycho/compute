import type { FeedItem, JobEntity, JobPhase, WorkerEntity } from "@/lib/feed";

export const PHASE_COLOR: Record<JobPhase, string> = {
  queued: "text-mute",
  assigned: "text-dim",
  executing: "text-signal-bright",
  rerouting: "text-violet",
  failed: "text-neg",
  completed: "text-pos",
  settled: "text-pos",
};

const latNote = (j: JobEntity) => (j.latencyState === "stable" ? "" : ` (${j.latencyState})`);

export function jobMeta(j: JobEntity): string {
  return `${j.type} · ${j.model}`;
}

export function itemTitle(i: FeedItem): string {
  if (i.kind === "job") {
    if (i.evt === "job_reroute") return i.entity.hash;
    return `${i.entity.hash} → ${i.entity.node}`;
  }
  if (i.kind === "worker") return `${i.entity.node} · ${i.entity.region}`;
  return i.evt.replace("_", " ");
}

export function itemDetail(i: FeedItem): string {
  if (i.kind === "job") {
    const j = i.entity;
    switch (i.evt) {
      case "job_submit":
        return `${jobMeta(j)} · entering mesh`;
      case "job_assign":
        return `${jobMeta(j)} → ${j.node}${i.note ? ` · ${i.note}` : ""}`;
      case "job_execute":
      case "job_progress":
        return `${jobMeta(j)} · ${Math.round(j.latencyLo)}–${Math.round(j.latencyHi)}ms${latNote(j)} · ${Math.round(j.progress)}%`;
      case "job_reroute":
        return `${j.rerouteReason} · ${j.previousNode} → ${j.node} · recovering`;
      case "job_fail":
        return `${jobMeta(j)} · retry scheduled`;
      case "job_complete":
        return `${jobMeta(j)} · ${j.reward?.toFixed(2)} USDC · ${j.settlement}`;
      case "job_settle":
        return `${j.reward?.toFixed(2)} USDC · ${i.note ?? j.settlement}`;
    }
  }
  if (i.kind === "worker") {
    const w = i.entity;
    const load = `${w.loadHist[0]}% → ${w.loadHist[1]}% → ${w.loadHist[2]}% (fluctuating)`;
    if (i.evt === "worker_load_change") return `gpu: ${w.gpu} · ${load}`;
    if (w.note) return `${w.note} · ${load}`;
    return load;
  }
  const parts = [i.note, i.state, `scope: ${i.scope}`].filter(Boolean);
  return parts.join(" · ");
}

export function itemStatusLabel(i: FeedItem): { label: string; cls: string } {
  if (i.kind === "job") {
    switch (i.evt) {
      case "job_submit":
        return { label: "submit", cls: "text-mute" };
      case "job_assign":
        return { label: "assign", cls: "text-dim" };
      case "job_execute":
      case "job_progress":
        return { label: "executing", cls: "text-signal-bright" };
      case "job_reroute":
        return { label: "rerouted", cls: "text-violet" };
      case "job_fail":
        return { label: "failed", cls: "text-neg" };
      case "job_complete":
        return { label: "completed", cls: "text-pos" };
      case "job_settle":
        return {
          label: i.entity.settlement === "settled" ? "settled" : "settling",
          cls: i.entity.settlement === "settled" ? "text-pos" : "text-mute",
        };
    }
  }
  if (i.kind === "worker") {
    const w = i.entity;
    if (w.status === "offline") return { label: "offline", cls: "text-neg" };
    if (w.status === "unstable") return { label: "unstable", cls: "text-neg" };
    if (w.status === "throttling") return { label: "throttling", cls: "text-violet" };
    if (w.status === "recovering") return { label: "recovering", cls: "text-cyan" };
    return { label: w.stressed ? "stable (stressed)" : "online", cls: "text-pos" };
  }
  if (i.evt === "slash_event") return { label: "slash", cls: "text-neg" };
  if (i.evt === "burn_batch")
    return { label: "burn", cls: i.state === "finalized" ? "text-cyan" : "text-mute" };
  if (i.evt === "stake_shift") return { label: "stake", cls: "text-violet" };
  return { label: "rewards", cls: i.state === "finalized" ? "text-cyan" : "text-mute" };
}

export function workerStatusText(w: WorkerEntity): { label: string; cls: string } {
  if (w.status === "offline") return { label: "offline", cls: "text-neg" };
  if (w.status === "unstable") return { label: "unstable", cls: "text-neg" };
  if (w.status === "throttling") return { label: "throttling", cls: "text-violet" };
  if (w.status === "recovering") return { label: "recovering", cls: "text-cyan" };
  return { label: w.stressed ? "stable (stressed)" : "online", cls: "text-pos" };
}
