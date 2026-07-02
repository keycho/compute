/**
 * Protocol simulation.
 *
 * One deterministic model drives every number on the site. The provider
 * mesh (lib/network.ts) is the ground truth; everything else derives
 * from it through explicit causal chains:
 *
 *   providers → capacity → throughput → queue depth → latency
 *   utilization + reliability → verification rate → rewards
 *
 * The rendered mesh is a representative sample: each simulated node
 * stands for SCALE real providers, so aggregate figures read at
 * network scale while staying consistent with what the WebGL layer
 * actually shows moving.
 */

import { createNetwork, stepNetwork, type NetworkState } from "./network";
import { gaussian, hashSeed, mulberry32 } from "./prng";

export const TICK_MS = 1400;
export const HISTORY = 96;
const SCALE = 200;
const TFLOPS_PER_GPU = 0.45; // sustained, network-wide average

export interface ClassTelemetry {
  key: string;
  /** GPUs of this class currently available (unallocated) */
  available: number;
  utilization: number;
  /** median routing latency to this class, ms */
  latency: number;
  /** normalized throughput history for sparklines */
  history: number[];
  dir: number;
}

export interface CurveLevel {
  x: number;
  size: number;
  total: number;
}

/** Two-sided cumulative curve: available capacity vs allocated load. */
export interface CapacityCurve {
  capacity: CurveLevel[];
  load: CurveLevel[];
  mid: number;
}

export interface ProtocolSnapshot {
  tick: number;
  /** aggregate metrics, all derived from mesh state */
  providers: number;
  activeGpus: number;
  availablePflops: number;
  throughputJobsMin: number;
  queueDepth: number;
  medianLatencyMs: number;
  verificationRate: number;
  utilization: number;
  jobsExecuted: number;
  epochRewards: number;
  regions: Array<{ key: string; pflops: number; history: number[]; delta: number }>;
  classes: ClassTelemetry[];
  utilizationHistory: number[];
}

const CLASS_LATENCY_BASE: Record<string, number> = {
  H100: 38,
  B200: 44,
  A100: 52,
  RTX5090: 71,
  MI300X: 58,
  GB300: 41,
};

type Listener = () => void;

class ProtocolEngine {
  readonly network: NetworkState;
  private rand: () => number;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private snapshot: ProtocolSnapshot;

  private throughputEma = 0;
  private queue = 18_000;
  private lastJobs: number;
  private classHistories = new Map<string, number[]>();
  private regionHistories = new Map<string, number[]>();
  private utilizationHistory: number[] = [];

  constructor() {
    this.network = createNetwork(72, "q0r-mainnet");
    this.rand = mulberry32(hashSeed("q0r-protocol"));
    // warm the mesh so first paint shows a network already under load
    const warm = mulberry32(0x9042);
    for (let i = 0; i < 260; i++) stepNetwork(this.network, 0.1, warm);
    this.lastJobs = this.network.totalJobs;
    // pre-roll histories so charts are full on first paint
    for (let i = 0; i < HISTORY; i++) this.advance(true);
    this.snapshot = this.build();
  }

  private classKeys(): string[] {
    return [...new Set(this.network.nodes.map((n) => n.gpuClass))];
  }

  private advance(preroll = false) {
    this.tick++;
    // the mesh is the ground truth: step it forward
    stepNetwork(this.network, (TICK_MS / 1000) * 2.2, this.rand);

    const nodes = this.network.nodes;
    const util = nodes.reduce((a, n) => a + n.utilization, 0) / nodes.length;

    // throughput derives from verified arrivals in the mesh
    const arrivals = this.network.totalJobs - this.lastJobs;
    this.lastJobs = this.network.totalJobs;
    const jobsPerMin = arrivals * (60_000 / TICK_MS) * SCALE * 0.62;
    this.throughputEma = this.throughputEma === 0 ? jobsPerMin : this.throughputEma * 0.9 + jobsPerMin * 0.1;

    // demand wanders slowly; queue integrates demand minus throughput
    const demand = this.throughputEma * (1 + 0.16 * Math.sin(this.tick / 46) + gaussian(this.rand) * 0.02);
    this.queue = Math.max(4_000, this.queue + (demand - this.throughputEma) * (TICK_MS / 60_000) * 9);

    // per-class telemetry
    for (const key of this.classKeys()) {
      const members = nodes.filter((n) => n.gpuClass === key);
      const load = members.reduce((a, n) => a + n.capacity * n.utilization, 0);
      const hist = this.classHistories.get(key) ?? [];
      hist.push(load);
      if (hist.length > HISTORY) hist.shift();
      this.classHistories.set(key, hist);
    }

    // per-region capacity
    for (const key of [...new Set(nodes.map((n) => n.region))]) {
      const members = nodes.filter((n) => n.region === key);
      const pflops = members.reduce((a, n) => a + n.capacity, 0) * SCALE * TFLOPS_PER_GPU * 1e-3;
      const hist = this.regionHistories.get(key) ?? [];
      hist.push(pflops);
      if (hist.length > HISTORY) hist.shift();
      this.regionHistories.set(key, hist);
    }

    this.utilizationHistory.push(util);
    if (this.utilizationHistory.length > HISTORY) this.utilizationHistory.shift();

    if (!preroll) {
      this.snapshot = this.build();
      this.listeners.forEach((l) => l());
    }
  }

  private build(): ProtocolSnapshot {
    const nodes = this.network.nodes;
    const util = nodes.reduce((a, n) => a + n.utilization, 0) / nodes.length;
    const reliability = nodes.reduce((a, n) => a + n.reliability, 0) / nodes.length;
    const totalGpus = nodes.reduce((a, n) => a + n.capacity, 0) * SCALE;
    const activeGpus = this.network.activeGpus * SCALE;
    const availableGpus = totalGpus - activeGpus;

    // latency rises with utilization and queue pressure — the causal chain
    const queuePressure = this.queue / 60_000;
    const medianLatencyMs = 58 * (1 + Math.pow(util, 3) * 0.55 + queuePressure * 0.35);

    const classes: ClassTelemetry[] = this.classKeys()
      .map((key) => {
        const members = nodes.filter((n) => n.gpuClass === key);
        const cUtil = members.reduce((a, n) => a + n.utilization, 0) / members.length;
        const cap = members.reduce((a, n) => a + n.capacity, 0);
        const hist = this.classHistories.get(key) ?? [];
        const dir = hist.length > 1 ? Math.sign(hist[hist.length - 1] - hist[hist.length - 2]) : 0;
        return {
          key,
          available: Math.round(cap * (1 - cUtil) * SCALE),
          utilization: cUtil,
          latency: (CLASS_LATENCY_BASE[key] ?? 55) * (1 + Math.pow(cUtil, 3) * 0.6 + queuePressure * 0.25),
          history: hist,
          dir,
        };
      })
      .sort((a, b) => b.available - a.available);

    const regions = [...this.regionHistories.entries()]
      .map(([key, history]) => ({
        key,
        pflops: history[history.length - 1] ?? 0,
        history,
        delta:
          history.length > 12
            ? ((history[history.length - 1] - history[history.length - 12]) / history[history.length - 12]) * 100
            : 0,
      }))
      .sort((a, b) => b.pflops - a.pflops);

    return {
      tick: this.tick,
      providers: nodes.length * SCALE + Math.round(Math.sin(this.tick / 60) * 26),
      activeGpus,
      availablePflops: availableGpus * TFLOPS_PER_GPU * 1e-3,
      throughputJobsMin: this.throughputEma,
      queueDepth: this.queue,
      medianLatencyMs,
      verificationRate: Math.min(99.999, 99.2 + reliability * 0.8 - queuePressure * 0.04),
      utilization: util,
      jobsExecuted: 2_800_000 + (this.network.totalJobs - 184_302) * SCALE,
      epochRewards: (this.network.settledUsd - 96_412_770) * SCALE * 0.011,
      regions,
      classes,
      utilizationHistory: this.utilizationHistory,
    };
  }

  /**
   * Capacity/load curve for a class: cumulative available capacity (left)
   * against cumulative allocated load (right), binned by routing latency.
   * Deterministic per tick.
   */
  curve(classKey: string, levels = 16): CapacityCurve {
    const members = this.network.nodes.filter((n) => n.gpuClass === classKey);
    if (!members.length) return { capacity: [], load: [], mid: 0 };
    const cUtil = members.reduce((a, n) => a + n.utilization, 0) / members.length;
    const rand = mulberry32(hashSeed(classKey) ^ this.tick);
    const base = (CLASS_LATENCY_BASE[classKey] ?? 55) * (1 + Math.pow(cUtil, 3) * 0.6);
    const capacity: CurveLevel[] = [];
    const load: CurveLevel[] = [];
    let ct = 0;
    let lt = 0;
    for (let i = 0; i < levels; i++) {
      const off = base * 0.012 * (i + 1) * (1 + rand() * 0.3);
      const c = (1 - cUtil) * (1 + rand() * 3) * (1 + i * 0.32) * 60;
      const l = cUtil * (1 + rand() * 3) * (1 + i * 0.32) * 60;
      ct += c;
      lt += l;
      capacity.push({ x: base - off, size: c, total: ct });
      load.push({ x: base + off, size: l, total: lt });
    }
    return { capacity, load, mid: base };
  }

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    if (!this.timer && typeof window !== "undefined") {
      this.timer = setInterval(() => this.advance(), TICK_MS);
    }
    return () => {
      this.listeners.delete(l);
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  };

  getSnapshot = (): ProtocolSnapshot => this.snapshot;
}

let engine: ProtocolEngine | null = null;

export function getProtocol(): ProtocolEngine {
  if (!engine) engine = new ProtocolEngine();
  return engine;
}
