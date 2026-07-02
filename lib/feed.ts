/**
 * The live event stream.
 *
 * This simulates a distributed system under stress, not a database.
 * Internally the engine keeps activeJobs / activeWorkers /
 * pendingSettlements — but it never exposes them as truth. It only
 * emits events derived from them: lifecycle logs that overlap, stall,
 * arrive late, and occasionally out of order. Latency is a band with a
 * mood, settlement is late and batched, nodes remember their failures,
 * and activity comes in bursts and quiet stretches.
 *
 * Everything the UI shows is locally true and globally incomplete.
 */

import { hashSeed, mulberry32 } from "./prng";

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
const SETTLE_NOTES = ["batch settlement", "delayed confirmation", "epoch catch-up"];

export type LatencyState = "stable" | "unstable" | "spike detected" | "recovered to baseline";

export type JobPhase =
  | "queued"
  | "assigned"
  | "executing"
  | "rerouting"
  | "failed"
  | "completed"
  | "settled";

export interface JobEntity {
  id: string;
  hash: string;
  node: string;
  previousNode?: string;
  gpu: string;
  type: WorkloadType;
  model: string;
  phase: JobPhase;
  progress: number;
  latencyLo: number;
  latencyHi: number;
  latencyState: LatencyState;
  retries: number;
  reward?: number;
  rerouteReason?: string;
  settlement: "in flight" | "pending batch settlement" | "delayed confirmation" | "settled";
  trace: string[];
}

export type WorkerStatus = "online" | "offline" | "unstable" | "throttling" | "recovering";

export interface WorkerEntity {
  node: string;
  region: string;
  gpu: string;
  status: WorkerStatus;
  /** last three observed loads, newest last */
  loadHist: [number, number, number];
  stressed: boolean;
  note?: string;
  earningsEpoch: number;
  /** decaying count of recent failures — raises reroute odds */
  failMemory: number;
  recent: Array<{ hash: string; phase: JobPhase }>;
}

export type JobEvtType =
  | "job_submit"
  | "job_assign"
  | "job_execute"
  | "job_progress"
  | "job_reroute"
  | "job_fail"
  | "job_complete"
  | "job_settle";

export type WorkerEvtType =
  | "worker_online"
  | "worker_offline"
  | "worker_load_change"
  | "worker_throttle"
  | "worker_recover";

export type EcoEvtType = "reward_batch" | "burn_batch" | "stake_shift" | "slash_event";

export interface JobEvt {
  kind: "job";
  id: string;
  block: number;
  evt: JobEvtType;
  entity: JobEntity;
  note?: string;
}

export interface WorkerEvt {
  kind: "worker";
  id: string;
  block: number;
  evt: WorkerEvtType;
  entity: WorkerEntity;
  note?: string;
}

export interface EcoEvt {
  kind: "economy";
  id: string;
  block: number;
  evt: EcoEvtType;
  amount?: number;
  unit?: "Q0R" | "USDC";
  state: "processing" | "pending" | "finalized";
  scope: string;
  note?: string;
  node?: string;
}

export type FeedItem = JobEvt | WorkerEvt | EcoEvt;

export interface FeedSnapshot {
  items: FeedItem[];
  workers: WorkerEntity[];
  tick: number;
  epoch: number;
  approx: {
    providersMasked: string;
    providersNote: string;
    jobsInFlightLo: number;
    jobsInFlightHi: number;
    executionDensity: "moderate" | "high" | "elevated";
    queuePressure: "falling" | "steady" | "rising";
    latencyLo: number;
    latencyHi: number;
    stakedNote: string;
    burnedNote: string;
    slashesEpoch: number;
    lastBurn?: EcoEvt;
    lastBuyback?: EcoEvt;
  };
}

type Listener = () => void;

const NODE_SEED = [
  ["nd-d592", "eu-central"], ["nd-b068", "ap-south"], ["nd-2ba4", "us-east"],
  ["nd-4c1a", "eu-central"], ["nd-91ff", "us-west"], ["nd-77aa", "eu-north"],
  ["nd-a61c", "ap-east"], ["nd-cd22", "us-east"], ["nd-e504", "sa-east"],
  ["nd-9bd0", "us-west"], ["nd-ba8e", "eu-central"], ["nd-d2ff", "ap-south"],
] as const;

type Mode = "normal" | "burst" | "quiet";

class FeedEngine {
  private rand = mulberry32(hashSeed("q0r-feed-v2"));
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private tick = 0;
  private block = 918_402;
  private seq = 0;

  // internal truth — never exposed directly
  private activeJobs: JobEntity[] = [];
  private activeWorkers: WorkerEntity[] = [];
  private pendingSettlements: JobEntity[] = [];
  private microQueue: Array<() => void> = [];

  private items: FeedItem[] = [];
  private snapshot!: FeedSnapshot;

  private mode: Mode = "normal";
  private modeTicks = 0;
  private spikeRegion: string | null = null;
  private slashesEpoch = 2;
  private lastBurn?: EcoEvt;
  private lastBuyback?: EcoEvt;
  private inFlightBase = 38_000;
  private prevInFlight = 38_000;

  constructor() {
    const r = this.rand;
    this.activeWorkers = NODE_SEED.map(([node, region]) => {
      const l = 35 + Math.floor(r() * 40);
      return {
        node,
        region,
        gpu: GPUS[Math.floor(r() * GPUS.length)],
        status: "online" as WorkerStatus,
        loadHist: [l, l + Math.floor((r() - 0.5) * 14), l + Math.floor((r() - 0.5) * 14)] as [
          number,
          number,
          number,
        ],
        stressed: false,
        earningsEpoch: 2 + r() * 14,
        failMemory: 0,
        recent: [],
      };
    });
    for (let i = 0; i < 46; i++) this.advance(true);
    this.snapshot = this.build();
  }

  /* ---------- helpers ---------- */

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

  private pickWorker(biasRegion?: string | null): WorkerEntity {
    const r = this.rand;
    const pool =
      biasRegion && r() < 0.7
        ? this.activeWorkers.filter((w) => w.region === biasRegion && w.status !== "offline")
        : this.activeWorkers.filter((w) => w.status !== "offline");
    const p = pool.length ? pool : this.activeWorkers;
    return p[Math.floor(r() * p.length)];
  }

  private emit(item: FeedItem) {
    this.items.unshift(item);
  }

  private emitJob(evt: JobEvtType, j: JobEntity, note?: string) {
    this.emit({ kind: "job", id: `e-${this.seq++}`, block: this.block++, evt, entity: j, note });
  }

  private emitWorker(evt: WorkerEvtType, w: WorkerEntity, note?: string) {
    this.emit({ kind: "worker", id: `e-${this.seq++}`, block: this.block++, evt, entity: w, note });
  }

  private emitEco(e: Omit<EcoEvt, "kind" | "id" | "block">) {
    const evt: EcoEvt = { kind: "economy", id: `e-${this.seq++}`, block: this.block++, ...e };
    this.emit(evt);
    if (evt.evt === "burn_batch") this.lastBurn = evt;
    if (evt.evt === "stake_shift" && evt.note === "buyback") this.lastBuyback = evt;
  }

  /* ---------- lifecycle ---------- */

  private spawnJob(biasRegion?: string | null) {
    const r = this.rand;
    const type = this.pickType();
    const [lo, hi] = LATENCY_BANDS[type];
    const w = this.pickWorker(biasRegion);
    const job: JobEntity = {
      id: `j-${this.seq++}`,
      hash: this.hash(),
      node: w.node,
      gpu: w.gpu,
      type,
      model: MODELS[type][Math.floor(r() * MODELS[type].length)],
      phase: "queued",
      progress: 0,
      latencyLo: lo + Math.floor(r() * 14),
      latencyHi: hi - Math.floor(r() * 30),
      latencyState: "stable",
      retries: 0,
      settlement: "in flight",
      trace: ["submitted"],
    };
    this.activeJobs.push(job);
    this.emitJob("job_submit", job);

    // assign + execute follow — occasionally logged out of order
    const outOfOrder = r() < 0.12;
    if (outOfOrder) {
      this.microQueue.push(() => {
        job.phase = "executing";
        job.trace.push("assigned", "executing");
        this.emitJob("job_execute", job);
      });
      this.microQueue.push(() => {
        this.emitJob("job_assign", job, "late log");
      });
    } else {
      this.microQueue.push(() => {
        job.phase = "assigned";
        job.trace.push("assigned");
        this.emitJob("job_assign", job);
      });
      this.microQueue.push(() => {
        job.phase = "executing";
        job.trace.push("executing");
        this.emitJob("job_execute", job);
      });
    }
  }

  private advanceJob(j: JobEntity) {
    const r = this.rand;
    if (j.phase === "rerouting") {
      j.phase = "executing";
      j.latencyState = "recovered to baseline";
      return;
    }
    if (j.phase !== "executing") return;

    // latency mood drifts
    const moodRoll = r();
    if (j.latencyState === "spike detected") {
      j.latencyState = moodRoll < 0.5 ? "unstable" : "recovered to baseline";
    } else if (moodRoll < 0.06) {
      j.latencyState = "spike detected";
      j.latencyHi += 30 + r() * 60;
    } else if (moodRoll < 0.18) {
      j.latencyState = "unstable";
    } else if (j.latencyState !== "stable" && moodRoll > 0.6) {
      j.latencyState = "stable";
    }

    // progress stalls sometimes
    if (r() > 0.18) j.progress = Math.min(100, j.progress + 3 + r() * 14);

    const w = this.activeWorkers.find((w) => w.node === j.node);
    const failBias = (w?.failMemory ?? 0) * 0.02 + (w?.stressed ? 0.015 : 0);

    if (j.progress >= 100) {
      const [rl, rh] = REWARD_BANDS[j.type];
      j.reward = rl + r() * (rh - rl);
      j.phase = "completed";
      j.settlement = "pending batch settlement";
      j.trace = j.trace.map((t) => (t === "executing" ? "executed" : t));
      j.trace.push("verified");
      this.emitJob("job_complete", j);
      this.pendingSettlements.push(j);
      this.activeJobs = this.activeJobs.filter((x) => x.id !== j.id);
      if (w) {
        w.earningsEpoch += j.reward;
        w.recent = [{ hash: j.hash, phase: j.phase }, ...w.recent].slice(0, 4);
      }
    } else if (r() < 0.045 + failBias) {
      // reroute — failure memory makes flaky nodes flakier
      const prev = j.node;
      const others = this.activeWorkers.filter((x) => x.node !== prev && x.status !== "offline");
      const next = others[Math.floor(r() * others.length)];
      j.previousNode = prev;
      j.node = next.node;
      j.gpu = next.gpu;
      j.phase = "rerouting";
      j.retries += 1;
      j.rerouteReason = REROUTE_REASONS[Math.floor(r() * REROUTE_REASONS.length)];
      j.trace.push(`rerouted (${j.rerouteReason})`);
      if (w) w.failMemory = Math.min(6, w.failMemory + 1.6);
      this.emitJob("job_reroute", j);
    } else if (r() < 0.014 + failBias * 0.6) {
      j.phase = "failed";
      j.trace.push("failed · retry scheduled");
      if (w) w.failMemory = Math.min(6, w.failMemory + 2.2);
      this.emitJob("job_fail", j);
      // retry: back into the pool after a beat
      this.microQueue.push(() => {
        if (j.retries < 3) {
          j.phase = "executing";
          j.retries += 1;
          j.progress = Math.max(0, j.progress - 20);
          j.trace.push("retrying");
        }
      });
    }
  }

  private settleBatch() {
    const r = this.rand;
    if (!this.pendingSettlements.length) return;
    this.emitEco({
      evt: "reward_batch",
      state: "processing",
      scope: "partial visibility",
      note: "triggered by execution cluster",
      unit: "USDC",
    });
    const take = Math.min(this.pendingSettlements.length, 1 + Math.floor(r() * 3));
    for (let i = 0; i < take; i++) {
      const j = this.pendingSettlements.shift()!;
      const late = r();
      j.settlement = late < 0.6 ? "settled" : "delayed confirmation";
      if (j.settlement === "settled") {
        j.phase = "settled";
        j.trace.push("paid");
      }
      this.emitJob("job_settle", j, SETTLE_NOTES[Math.floor(r() * SETTLE_NOTES.length)]);
    }
  }

  private workerTick() {
    const r = this.rand;
    for (const w of this.activeWorkers) {
      const amp = w.stressed ? 16 : 8;
      const next = Math.max(8, Math.min(98, w.loadHist[2] + (r() - 0.5) * amp));
      w.loadHist = [w.loadHist[1], w.loadHist[2], Math.round(next)];
      w.failMemory = Math.max(0, w.failMemory - 0.06);
      if (w.failMemory > 1.5) w.stressed = true;
      else if (r() < 0.04) w.stressed = !w.stressed;
    }
  }

  private emitWorkerEvent(biasRegion?: string | null) {
    const r = this.rand;
    const w = this.pickWorker(biasRegion);
    const roll = r();
    if (w.status === "offline") {
      w.status = "online";
      w.note = undefined;
      this.emitWorker("worker_online", w, "rejoined mesh");
    } else if (w.status === "throttling" || w.status === "unstable") {
      w.status = roll < 0.6 ? "recovering" : "online";
      w.note = w.status === "recovering" ? "load normalizing" : undefined;
      this.emitWorker("worker_recover", w);
    } else if (roll < 0.14) {
      w.status = "offline";
      w.note = "connection lost";
      w.failMemory = Math.min(6, w.failMemory + 2);
      this.emitWorker("worker_offline", w);
    } else if (roll < 0.42) {
      w.status = "throttling";
      w.stressed = true;
      w.note = "thermal throttling";
      this.emitWorker("worker_throttle", w);
    } else if (roll < 0.62) {
      w.status = "unstable";
      w.note = "packet loss to peer";
      this.emitWorker("worker_throttle", w, "network degraded");
    } else {
      this.emitWorker("worker_load_change", w);
    }
  }

  private economyTick() {
    const r = this.rand;
    const roll = r();
    if (roll < 0.45) {
      this.emitEco({
        evt: "burn_batch",
        amount: 4_000 + Math.floor(r() * 14_000),
        unit: "Q0R",
        state: r() < 0.5 ? "processing" : "pending",
        scope: "partial visibility",
        note: "triggered by execution cluster",
      });
    } else if (roll < 0.7) {
      this.emitEco({
        evt: "stake_shift",
        amount: 20_000 + Math.floor(r() * 180_000),
        unit: "Q0R",
        state: "finalized",
        scope: "routing pools",
        note: r() < 0.3 ? "buyback" : r() < 0.6 ? "restake" : "weight rebalance",
      });
    } else if (roll < 0.82) {
      const w = this.pickWorker();
      this.slashesEpoch += 1;
      this.emitEco({
        evt: "slash_event",
        amount: 800 + Math.floor(r() * 4_200),
        unit: "Q0R",
        state: "finalized",
        scope: "trust adjustment",
        note: "invalid execution",
        node: w.node,
      });
      w.failMemory = Math.min(6, w.failMemory + 3);
    } else {
      this.settleBatch();
    }
  }

  /* ---------- the loop ---------- */

  private advance(preroll = false) {
    this.tick++;
    const r = this.rand;

    // mode transitions: bursts, quiet stretches, regional spikes
    this.modeTicks--;
    if (this.modeTicks <= 0) {
      const roll = r();
      if (roll < 0.16) {
        this.mode = "burst";
        this.modeTicks = 3 + Math.floor(r() * 5);
        this.spikeRegion = r() < 0.6 ? REGIONS[Math.floor(r() * REGIONS.length)] : null;
      } else if (roll < 0.3) {
        this.mode = "quiet";
        this.modeTicks = 2 + Math.floor(r() * 4);
        this.spikeRegion = null;
      } else {
        this.mode = "normal";
        this.modeTicks = 4 + Math.floor(r() * 8);
        this.spikeRegion = null;
      }
    }

    // drain one deferred lifecycle step per tick (keeps logs overlapping)
    const step = this.microQueue.shift();
    if (step) step();

    // entity drift always happens
    for (const j of [...this.activeJobs]) this.advanceJob(j);
    this.workerTick();

    // event emission budget by mode
    const budget =
      this.mode === "burst"
        ? 2 + Math.floor(r() * 3)
        : this.mode === "quiet"
          ? r() < 0.4
            ? 1
            : 0
          : 1 + Math.floor(r() * 2);
    for (let i = 0; i < budget; i++) {
      const roll = r();
      const executing = this.activeJobs.filter((j) => j.phase === "executing");
      if (roll < 0.55) {
        if (executing.length < 4 || (executing.length < 11 && r() < 0.55)) {
          this.spawnJob(this.spikeRegion);
        } else if (executing.length) {
          const j = executing[Math.floor(r() * executing.length)];
          this.emitJob("job_progress", j);
        }
      } else if (roll < 0.82) {
        this.emitWorkerEvent(this.spikeRegion);
      } else {
        this.economyTick();
      }
    }
    if (this.tick % 9 === 0) this.settleBatch();

    // approximate pressure signal
    this.inFlightBase +=
      (r() - 0.5) * 900 + (this.mode === "burst" ? 260 : this.mode === "quiet" ? -220 : 0);
    this.inFlightBase = Math.max(31_000, Math.min(46_000, this.inFlightBase));

    this.items = this.items.slice(0, 48).map((i) => ({ ...i }) as FeedItem);

    if (!preroll) {
      this.snapshot = this.build();
      this.listeners.forEach((l) => l());
    }
  }

  private build(): FeedSnapshot {
    const executing = this.activeJobs.filter(
      (j) => j.phase === "executing" || j.phase === "rerouting",
    );
    const lats = executing.map((j) => (j.latencyLo + j.latencyHi) / 2);
    const lo = lats.length ? Math.min(...lats) : 74;
    const hi = lats.length ? Math.max(...lats) : 112;
    const drift = this.inFlightBase - this.prevInFlight;
    this.prevInFlight = this.inFlightBase;
    return {
      items: this.items,
      workers: this.activeWorkers.map((w) => ({
        ...w,
        loadHist: [...w.loadHist] as [number, number, number],
        recent: [...w.recent],
      })),
      tick: this.tick,
      epoch: EPOCH,
      approx: {
        providersMasked: "14,0xx",
        providersNote: this.tick % 23 < 9 ? "sync lagging" : "partial visibility",
        jobsInFlightLo: Math.round((this.inFlightBase - 1_600) / 100) * 100,
        jobsInFlightHi: Math.round((this.inFlightBase + 1_900) / 100) * 100,
        executionDensity:
          this.mode === "burst" ? "elevated" : executing.length >= 7 ? "high" : "moderate",
        queuePressure: drift > 120 ? "rising" : drift < -120 ? "falling" : "steady",
        latencyLo: Math.min(lo, 82),
        latencyHi: Math.max(hi, 108),
        stakedNote: "~14m–15m · shifting across routing pools",
        burnedNote: "~8m+ rolling · partial visibility",
        slashesEpoch: this.slashesEpoch,
        lastBurn: this.lastBurn,
        lastBuyback: this.lastBuyback,
      },
    };
  }

  /** variable cadence: the network does not tick on a metronome */
  private schedule() {
    if (!this.running) return;
    const r = this.rand;
    const base =
      this.mode === "burst"
        ? 550 + r() * 450
        : this.mode === "quiet"
          ? 1_500 + r() * 900
          : 850 + r() * 700;
    this.timer = setTimeout(() => {
      this.advance();
      this.schedule();
    }, base);
  }

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    if (!this.running && typeof window !== "undefined") {
      this.running = true;
      this.schedule();
    }
    return () => {
      this.listeners.delete(l);
      if (this.listeners.size === 0) {
        this.running = false;
        if (this.timer) clearTimeout(this.timer);
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
