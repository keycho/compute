/**
 * Network simulation.
 *
 * Models the provider mesh as a graph: luminous nodes (providers) laid out
 * on a fibonacci sphere-ish disc, edges to nearest peers, and jobs as energy
 * packets traversing edges. Earnings accumulate as light on the destination
 * node. The same topology feeds the WebGL scene and the network console, so
 * the marketing surface and the operational surface show one system.
 */

import { hashSeed, mulberry32 } from "./prng";

export interface ProviderNode {
  id: string;
  region: string;
  gpuClass: string;
  x: number;
  y: number;
  z: number;
  capacity: number; // GPUs
  utilization: number; // 0..1
  reliability: number; // 0..1
  stake: number; // Q0R staked
  earnings: number; // accumulated this session
  glow: number; // transient light from job arrivals, decays
  tier: 0 | 1 | 2; // visual weight
}

export interface NetworkEdge {
  a: number;
  b: number;
  length: number;
}

export interface JobPacket {
  id: number;
  edge: number;
  /** 0..1 position along edge; sign of speed encodes direction */
  t: number;
  speed: number;
  size: number; // visual scale + payment magnitude
  kind: "inference" | "training" | "settlement";
}

const REGIONS = ["us-east", "us-west", "eu-central", "eu-north", "ap-south", "ap-east", "sa-east", "me-central"];
const GPU_CLASSES = ["H100", "B200", "A100", "RTX5090", "MI300X", "GB300"];
const KINDS: JobPacket["kind"][] = ["inference", "inference", "inference", "training", "training", "settlement"];

export interface JobEvent {
  id: number;
  nodeId: string;
  region: string;
  kind: JobPacket["kind"];
  tflopHours: number;
  paidUsd: number;
  at: number;
}

export interface NetworkState {
  nodes: ProviderNode[];
  edges: NetworkEdge[];
  jobs: JobPacket[];
  /** ring buffer of recent arrivals, newest first */
  events: JobEvent[];
  time: number;
  totalJobs: number;
  settledUsd: number;
  activeGpus: number;
}

export function createNetwork(nodeCount = 56, seed = "q0r-mesh"): NetworkState {
  const rand = mulberry32(hashSeed(seed));
  const nodes: ProviderNode[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < nodeCount; i++) {
    // fibonacci disc with jitter and mild depth: an organic constellation
    const r = Math.sqrt((i + 0.5) / nodeCount);
    const theta = i * golden;
    const jitter = 0.09;
    const x = r * Math.cos(theta) + (rand() - 0.5) * jitter;
    const y = r * Math.sin(theta) + (rand() - 0.5) * jitter;
    const z = (rand() - 0.5) * 0.34;
    const tier: 0 | 1 | 2 = rand() < 0.12 ? 2 : rand() < 0.42 ? 1 : 0;
    nodes.push({
      id: `nd-${(hashSeed(`${seed}:${i}`) % 0xffff).toString(16).padStart(4, "0")}`,
      region: REGIONS[Math.floor(rand() * REGIONS.length)],
      gpuClass: GPU_CLASSES[Math.floor(rand() * GPU_CLASSES.length)],
      x,
      y,
      z,
      capacity: tier === 2 ? 512 + Math.floor(rand() * 1536) : tier === 1 ? 64 + Math.floor(rand() * 192) : 8 + Math.floor(rand() * 24),
      utilization: 0.55 + rand() * 0.4,
      reliability: 0.962 + rand() * 0.037,
      stake: Math.floor((tier + 1) * (40_000 + rand() * 260_000)),
      earnings: rand() * 40,
      glow: 0,
      tier,
    });
  }

  // connect each node to its 2-3 nearest neighbours; dedupe edges
  const edgeSet = new Set<string>();
  const edges: NetworkEdge[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const dists = nodes
      .map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 + (n.z - nodes[i].z) ** 2 }))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.d - b.d);
    const links = 2 + (nodes[i].tier > 0 ? 1 : 0);
    for (let k = 0; k < links; k++) {
      const j = dists[k].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ a: Math.min(i, j), b: Math.max(i, j), length: Math.sqrt(dists[k].d) });
    }
  }

  return {
    nodes,
    edges,
    jobs: [],
    events: [],
    time: 0,
    totalJobs: 184_302,
    settledUsd: 96_412_770,
    activeGpus: nodes.reduce((a, n) => a + Math.round(n.capacity * n.utilization), 0),
  };
}

let jobId = 0;

/**
 * Advance the simulation by dt seconds. Mutates state in place — callers
 * (r3f useFrame / rAF loops) own the render cadence.
 */
export function stepNetwork(state: NetworkState, dt: number, rand: () => number = Math.random): void {
  state.time += dt;
  // spawn jobs — poisson-ish
  const spawnRate = 6; // jobs/sec across the mesh
  if (rand() < spawnRate * dt && state.jobs.length < 90) {
    const edge = Math.floor(rand() * state.edges.length);
    const kind = KINDS[Math.floor(rand() * KINDS.length)];
    // speed sign must point away from the spawn end, or the packet
    // "arrives" in the same step it spawned and never renders
    const startAtA = rand() < 0.5;
    state.jobs.push({
      id: jobId++,
      edge,
      t: startAtA ? 0 : 1,
      speed: (0.35 + rand() * 0.5) * (startAtA ? 1 : -1),
      size: kind === "training" ? 1.6 + rand() * 1.4 : kind === "settlement" ? 1.1 : 0.6 + rand() * 0.5,
      kind,
    });
  }

  // advance packets; on arrival, light up the destination and settle value
  for (let i = state.jobs.length - 1; i >= 0; i--) {
    const j = state.jobs[i];
    j.t += j.speed * dt * (1 / Math.max(state.edges[j.edge].length * 6, 0.5));
    if (j.t <= 0 || j.t >= 1) {
      const e = state.edges[j.edge];
      const nodeIdx = j.t >= 1 ? e.b : e.a;
      const n = state.nodes[nodeIdx];
      n.glow = Math.min(n.glow + 0.55 * j.size, 2.2);
      n.earnings += j.size * (2.1 + rand() * 3.2);
      const paid = j.size * (14 + rand() * 60);
      state.totalJobs += 1;
      state.settledUsd += paid;
      state.events.unshift({
        id: j.id,
        nodeId: n.id,
        region: n.region,
        kind: j.kind,
        tflopHours: j.size * (1.8 + rand() * 4),
        paidUsd: paid,
        at: state.time,
      });
      if (state.events.length > 24) state.events.pop();
      state.jobs.splice(i, 1);
    }
  }

  // decay glow, drift utilization
  for (const n of state.nodes) {
    n.glow *= Math.exp(-dt * 1.9);
    n.utilization = Math.min(0.99, Math.max(0.3, n.utilization + (rand() - 0.5) * dt * 0.05));
  }
  state.activeGpus = state.nodes.reduce((a, n) => a + Math.round(n.capacity * n.utilization), 0);
}
