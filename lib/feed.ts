/**
 * The live event stream.
 *
 * One seeded engine emits everything the UI treats as "happening":
 * jobs spawning, progressing, rerouting, failing, finalizing; workers
 * flapping; burns and payouts landing. Rows update in place, new rows
 * arrive on top, and nothing is ever perfectly clean — latency drifts,
 * progress stalls, nodes drop. Deterministic first frames keep SSR and
 * hydration in agreement; noise starts once the interval runs.
 */

import { hashSeed, mulberry32 } from "./prng";

export const FEED_TICK_MS = 1100;
export const EPOCH = 1284;

export type WorkloadType = "inference" | "render" | "training" | "video" | "sim";

const MODELS: Record<WorkloadType, string[]> = {
  inference: ["qwen3-8b", "llama-3.3-70b", "deepseek-r1", "whisper-v3", "qwen3-32b"],
  render: ["sdxl", "flux-dev", "cycles-bake"],
  training: ["lora", "dreambooth", "rlhf-batch"],
  video: ["wan-2.2", "hunyuan-vid"],
  sim: ["fold-md", "cfd-mesh"],
};

const TYPE_WEIGHTS: Array<[WorkloadType, number]> = [
  ["inference", 0.45],
  ["render", 0.2],
  ["training", 0.15],
  ["video", 0.12],
  ["sim", 0.08],
];

const LATENCY_BANDS: Record<WorkloadType, [number, number]> = {
  inference: [60, 140],
  render: [90, 260],
  training: [120, 340],
  video: [110, 300],
  sim: [100, 280],
};

const REWARD_BANDS: Record<WorkloadType, [number, number]> = {
  inference: [0.12, 0.9],
  render: [2.4, 30],
  training: [5, 60],
  video: [2, 22],
  sim: [4, 26],
};

const REGIONS = ["us-east", "us-west", "eu-central", "eu-north", "ap-south", "ap-east", "sa-east"];
const GPUS = ["1× H100", "2× RTX 5090", "4× A100 80G", "1× B200", "8× H100", "2× MI300X", "1× RTX 4090"];
const REROUTE_REASONS = ["node dropout", "thermal throttling", "deadline risk", "packet loss"];
const WORKER_NOTES = ["thermal throttling", "packet loss to peer", "driver restart", "load spike"];

export type JobStatus =
  | "running"
  | "completed"
  | "rerouted"
  | "failed"
  | "pending finalization";

export interface JobItem {
  kind: "job";
  id: string;
  block: number;
  hash: string;
  node: string;
  gpu: string;
  type: WorkloadType;
  model: string;
  status: JobStatus;
  progress: number;
  latencyLo: number;
  latencyHi: number;
  latencyNow: number;
  retries: number;
  reward?: number;
  finalized: boolean;
  rerouteReason?: string;
  previousNode?: string;
  trace: string[];
  updatedTick: number;
}

export interface WorkerItem {
  kind: "worker";
  id: string;
  block: number;
  node: string;
  region: string;
  gpu: string;
  status: "online" | "unstable" | "throttling" | "recovering";
  loadLo: number;
  loadHi: number;
  loadNow: number;
  note?: string;
  earningsEpoch: number;
  recent: Array<{ hash: string; status: JobStatus }>;
  updatedTick: number;
}

export interface TokenItem {
  kind: "token";
  id: string;
  block: number;
  type: "burn" | "staker payout" | "slash" | "buyback";
  amount: number;
  unit: "Q0R" | "USDC";
  source: string;
  state: "finalized" | "pending";
  node?: string;
  updatedTick: number;
}

export type FeedItem = JobItem | WorkerItem | TokenItem;

export interface FeedSnapshot {
  items: FeedItem[];
  workers: WorkerItem[];
  tick: number;
  epoch: number;
  approx: {
    providersMasked: string;
    providersNote: string;
    jobsInFlight: number;
    jobsInFlightLo: number;
    jobsInFlightHi: number;
    executionDensity: "moderate" | "high" | "elevated";
    queuePressure: "falling" | "steady" | "rising";
    latencyLo: number;
    latencyHi: number;
    /** millions of Q0R staked, drifting */
    stakedM: number;
    revenueEpoch: number;
    burnedTotal: number;
    burnedEpoch: number;
    rewardsPaidEpoch: number;
    pendingSettlement: number;
    slashesEpoch: number;
    lastBurn?: TokenItem;
    lastBuyback?: TokenItem;
  };
}

type Listener = () => void;

const NODE_IDS = [
  "nd-d592", "nd-b068", "nd-2ba4", "nd-4c1a", "nd-91ff", "nd-77aa", "nd-a61c",
  "nd-cd22", "nd-e504", "nd-9bd0", "nd-ba8e", "nd-d2ff", "nd-239e", "nd-8f13",
];

class FeedEngine {
  private rand = mulberry32(hashSeed("q0r-feed"));
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private block = 918_402;
  private seq = 0;
  private items: FeedItem[] = [];
  private workers: WorkerItem[] = [];
  private snapshot!: FeedSnapshot;

  private stakedM = 14.2;
  private revenueEpoch = 231_400;
  private burnedTotal = 8_412_000;
  private burnedEpoch = 0;
  private rewardsPaidEpoch = 168_900;
  private pendingSettlement = 41_200;
  private slashesEpoch = 2;
  private lastBurn?: TokenItem;
  private lastBuyback?: TokenItem;
  private prevInFlight = 38_000;

  constructor() {
    // seed workers
    const r = this.rand;
    this.workers = NODE_IDS.slice(0, 8).map((node, i) => ({
      kind: "worker" as const,
      id: `w-${node}`,
      block: this.block++,
      node,
      region: REGIONS[Math.floor(r() * REGIONS.length)],
      gpu: GPUS[Math.floor(r() * GPUS.length)],
      status: "online" as const,
      loadLo: 35 + Math.floor(r() * 25),
      loadHi: 65 + Math.floor(r() * 30),
      loadNow: 50 + Math.floor(r() * 30),
      earningsEpoch: 2 + r() * 14,
      recent: [],
      updatedTick: 0,
    }));
    // pre-roll so the first paint is already mid-stream
    for (let i = 0; i < 34; i++) this.advance(true);
    this.snapshot = this.build();
  }

  private pickType(): WorkloadType {
    let x = this.rand();
    for (const [t, w] of TYPE_WEIGHTS) {
      if (x < w) return t;
      x -= w;
    }
    return "inference";
  }

  private hash(): string {
    return `0x${((this.rand() * 0xffffff) | 0).toString(16).padStart(6, "0")}`;
  }

  private spawnJob() {
    const r = this.rand;
    const type = this.pickType();
    const [lo, hi] = LATENCY_BANDS[type];
    const worker = this.workers[Math.floor(r() * this.workers.length)];
    const job: JobItem = {
      kind: "job",
      id: `j-${this.seq++}`,
      block: this.block++,
      hash: this.hash(),
      node: worker.node,
      gpu: worker.gpu,
      type,
      model: MODELS[type][Math.floor(r() * MODELS[type].length)],
      status: "running",
      progress: Math.floor(r() * 12),
      latencyLo: lo + Math.floor(r() * 14),
      latencyHi: hi - Math.floor(r() * 30),
      latencyNow: lo + r() * (hi - lo),
      retries: 0,
      finalized: false,
      trace: ["submitted", "assigned", "executing"],
      updatedTick: this.tick,
    };
    this.items.unshift(job);
  }

  private emitWorkerEvent() {
    const r = this.rand;
    const w = this.workers[Math.floor(r() * this.workers.length)];
    const roll = r();
    if (w.status === "unstable" || w.status === "throttling") {
      w.status = roll < 0.6 ? "recovering" : "online";
      w.note = undefined;
    } else {
      w.status = roll < 0.5 ? "unstable" : "throttling";
      w.note =
        w.status === "throttling"
          ? "thermal throttling"
          : WORKER_NOTES[Math.floor(r() * WORKER_NOTES.length)];
    }
    w.updatedTick = this.tick;
    const evt: WorkerItem = { ...w, id: `we-${this.seq++}`, block: this.block++, recent: [...w.recent] };
    this.items.unshift(evt);
  }

  private emitBurn() {
    const r = this.rand;
    const burn: TokenItem = {
      kind: "token",
      id: `t-${this.seq++}`,
      block: this.block++,
      type: r() < 0.8 ? "burn" : "buyback",
      amount: 4_000 + Math.floor(r() * 14_000),
      unit: "Q0R",
      source: "execution fees",
      state: "pending",
      updatedTick: this.tick,
    };
    this.items.unshift(burn);
    this.burnedTotal += burn.amount;
    this.burnedEpoch += burn.amount;
    if (burn.type === "buyback") this.lastBuyback = burn;
    else this.lastBurn = burn;
  }

  private emitSlash() {
    const r = this.rand;
    const w = this.workers[Math.floor(r() * this.workers.length)];
    const slash: TokenItem = {
      kind: "token",
      id: `t-${this.seq++}`,
      block: this.block++,
      type: "slash",
      amount: 800 + Math.floor(r() * 4_200),
      unit: "Q0R",
      source: "invalid execution",
      state: "finalized",
      node: w.node,
      updatedTick: this.tick,
    };
    this.items.unshift(slash);
    this.slashesEpoch += 1;
  }

  private advance(preroll = false) {
    this.tick++;
    const r = this.rand;

    // keep 6–10 jobs in flight
    const running = this.items.filter(
      (i): i is JobItem => i.kind === "job" && (i.status === "running" || i.status === "rerouted"),
    );
    if (running.length < 6 || (running.length < 10 && r() < 0.5)) this.spawnJob();

    // advance running jobs
    for (const j of running) {
      j.updatedTick = this.tick;
      j.latencyNow = Math.max(
        j.latencyLo,
        Math.min(j.latencyHi, j.latencyNow + (r() - 0.5) * 26),
      );
      if (j.status === "rerouted") {
        // resume on the new node after a beat
        j.status = "running";
        continue;
      }
      // occasional stall, otherwise progress
      if (r() > 0.15) j.progress = Math.min(100, j.progress + 4 + r() * 15);

      if (j.progress >= 100) {
        const [rl, rh] = REWARD_BANDS[j.type];
        j.reward = rl + r() * (rh - rl);
        j.trace = j.trace.map((t) => (t === "executing" ? "executed" : t));
        j.trace.push("verified");
        if (r() < 0.25) {
          j.status = "pending finalization";
        } else {
          j.status = "completed";
          j.finalized = true;
          j.trace.push("paid");
        }
        this.revenueEpoch += j.reward;
        this.rewardsPaidEpoch += j.reward * 0.85;
        this.pendingSettlement += j.reward * 0.15;
        const w = this.workers.find((w) => w.node === j.node);
        if (w) {
          w.earningsEpoch += j.reward;
          w.recent = [{ hash: j.hash, status: j.status }, ...w.recent].slice(0, 4);
        }
      } else if (r() < 0.035) {
        // reroute mid-flight
        const prev = j.node;
        const others = this.workers.filter((w) => w.node !== prev);
        const next = others[Math.floor(r() * others.length)];
        j.status = "rerouted";
        j.previousNode = prev;
        j.node = next.node;
        j.gpu = next.gpu;
        j.rerouteReason = REROUTE_REASONS[Math.floor(r() * REROUTE_REASONS.length)];
        j.retries += 1;
        j.trace.push(`rerouted (${j.rerouteReason})`);
      } else if (r() < 0.012) {
        j.status = "failed";
        j.trace.push("failed · retry scheduled");
      }
    }

    // finalize pending jobs
    for (const i of this.items) {
      if (i.kind === "job" && i.status === "pending finalization" && this.tick - i.updatedTick > 2) {
        i.status = "completed";
        i.finalized = true;
        i.trace.push("paid");
        i.updatedTick = this.tick;
      }
      if (i.kind === "token" && i.state === "pending" && this.tick - i.updatedTick > 3) {
        i.state = "finalized";
        i.updatedTick = this.tick;
      }
    }

    // worker load drift
    for (const w of this.workers) {
      w.loadNow = Math.max(
        15,
        Math.min(97, w.loadNow + (r() - 0.5) * 9),
      );
      w.loadLo = Math.min(w.loadLo, Math.round(w.loadNow));
      w.loadHi = Math.max(w.loadHi, Math.round(w.loadNow));
      // bands slowly forget extremes
      w.loadLo += 0.08;
      w.loadHi -= 0.08;
    }

    // ambient events
    if (this.tick % 7 === 0 && r() < 0.7) this.emitWorkerEvent();
    if (this.tick % 9 === 0 && r() < 0.8) this.emitBurn();
    if (this.tick % 41 === 0 && r() < 0.3) this.emitSlash();

    // token supply / staking drift
    this.stakedM = Math.max(12.8, Math.min(15.6, this.stakedM + (r() - 0.5) * 0.04));
    this.pendingSettlement = Math.max(8_000, this.pendingSettlement * (1 + (r() - 0.52) * 0.01));

    this.items = this.items.slice(0, 44).map((i) => ({ ...i }) as FeedItem);

    if (!preroll) {
      this.snapshot = this.build();
      this.listeners.forEach((l) => l());
    }
  }

  private build(): FeedSnapshot {
    const running = this.items.filter(
      (i): i is JobItem => i.kind === "job" && i.status !== "completed" && i.status !== "failed",
    );
    const lats = running.map((j) => j.latencyNow);
    const lo = lats.length ? Math.min(...lats) : 70;
    const hi = lats.length ? Math.max(...lats) : 110;
    const inFlight = 36_000 + Math.round(Math.sin(this.tick / 18) * 2_800) + running.length * 40;
    const drift = inFlight - this.prevInFlight;
    this.prevInFlight = inFlight;
    const density = running.length >= 9 ? "elevated" : running.length >= 7 ? "high" : "moderate";
    const pressure = drift > 40 ? "rising" : drift < -40 ? "falling" : "steady";
    return {
      items: this.items,
      workers: this.workers.map((w) => ({ ...w })),
      tick: this.tick,
      epoch: EPOCH,
      approx: {
        providersMasked: "14,0xx",
        providersNote: this.tick % 23 < 9 ? "sync lagging" : "partial visibility",
        jobsInFlight: inFlight,
        jobsInFlightLo: inFlight - 1_400 - (inFlight % 500),
        jobsInFlightHi: inFlight + 1_600 + (inFlight % 300),
        executionDensity: density,
        queuePressure: pressure,
        latencyLo: Math.min(lo, 78),
        latencyHi: Math.max(hi, 104),
        stakedM: this.stakedM,
        revenueEpoch: this.revenueEpoch,
        burnedTotal: this.burnedTotal,
        burnedEpoch: this.burnedEpoch,
        rewardsPaidEpoch: this.rewardsPaidEpoch,
        pendingSettlement: this.pendingSettlement,
        slashesEpoch: this.slashesEpoch,
        lastBurn: this.lastBurn,
        lastBuyback: this.lastBuyback,
      },
    };
  }

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    if (!this.timer && typeof window !== "undefined") {
      this.timer = setInterval(() => this.advance(), FEED_TICK_MS);
    }
    return () => {
      this.listeners.delete(l);
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  };

  getSnapshot = (): FeedSnapshot => this.snapshot;
}

let engine: FeedEngine | null = null;

export function getFeed(): FeedEngine {
  if (!engine) engine = new FeedEngine();
  return engine;
}
