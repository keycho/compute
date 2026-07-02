/**
 * Inference session simulation for /run.
 *
 * Deterministic per (prompt, model): the same request streams the same
 * answer from the same node — which is exactly what a verifiable
 * network should do. The pipeline stages mirror the real lifecycle:
 * finding worker → assigned → executing → streaming → verified.
 */

import { hashSeed, mulberry32 } from "./prng";

export const MODELS = [
  { key: "llama", label: "Llama", id: "llama-3.3-70b" },
  { key: "qwen", label: "Qwen", id: "qwen3-32b" },
  { key: "deepseek", label: "DeepSeek", id: "deepseek-r1" },
  { key: "gemma", label: "Gemma", id: "gemma-2-27b" },
] as const;

export type ModelKey = (typeof MODELS)[number]["key"];

const NODES = [
  "nd-da01", "nd-d592", "nd-4c1a", "nd-77aa", "nd-b068", "nd-cd22",
  "nd-91ff", "nd-a61c", "nd-2ba4", "nd-e504",
];
const GPUS = ["2× RTX 5090", "1× H100", "4× A100 80G", "1× B200", "2× MI300X"];

export interface RunMeta {
  node: string;
  gpu: string;
  latencyLo: number;
  latencyHi: number;
  costUsdc: number;
  tokens: number;
}

const OPENERS: Record<ModelKey, string[]> = {
  llama: ["Here's a grounded way to think about it.", "Short answer first, then the reasoning."],
  qwen: ["Let me break this down cleanly.", "There are three parts to this."],
  deepseek: ["Working through this step by step.", "First, the core of the question."],
  gemma: ["Here's a compact answer.", "The short version, then detail."],
};

const CONNECTIVES = [
  "In practice,", "More concretely,", "The key detail is that", "It helps to remember that",
  "From there,", "On the other side,", "What most people miss is that", "Put differently,",
];

const VERBS = [
  "depends on", "comes down to", "is shaped by", "usually starts with", "tends to follow",
  "interacts with", "scales with", "breaks down into",
];

const ABSTRACT = [
  "the constraints you actually have", "a small number of moving parts", "the trade-off you pick first",
  "how the pieces talk to each other", "what you can verify at each step", "the boundary conditions",
  "the failure modes you plan for", "the simplest version that works",
];

const CLOSERS = [
  "If you want, give me one more constraint and I can make this more specific.",
  "That's the shape of it — the details bend to your specific case.",
  "Start with the smallest version of this and expand where it strains.",
  "The rest is iteration against real feedback.",
];

/** pull content words from the prompt so the answer reflects it */
function keywords(prompt: string): string[] {
  const stop = new Set(["the", "a", "an", "and", "or", "but", "for", "with", "what", "how", "why", "is", "are", "can", "could", "should", "would", "does", "about", "that", "this", "these", "into", "from", "your", "you", "me", "my", "i", "of", "to", "in", "on", "it", "as", "be", "do", "did", "will", "please", "tell", "explain", "write", "make", "give"]);
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  return [...new Set(words)].slice(0, 6);
}

export function synthesize(prompt: string, model: ModelKey): { text: string; meta: RunMeta } {
  const seed = hashSeed(`${model}:${prompt.trim().toLowerCase()}`);
  const r = mulberry32(seed);
  const kw = keywords(prompt);
  const topic = kw.length ? kw.slice(0, 2).join(" ") : "this";
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];

  const paras: string[] = [];
  paras.push(
    `${pick(OPENERS[model])} ${topic.charAt(0).toUpperCase() + topic.slice(1)} ${pick(VERBS)} ${pick(ABSTRACT)}, and the way in matters more than the tooling.`,
  );

  const points = 2 + Math.floor(r() * 2);
  for (let i = 0; i < points; i++) {
    const k = kw[i % Math.max(kw.length, 1)] ?? "the core idea";
    paras.push(
      `${pick(CONNECTIVES)} ${k} ${pick(VERBS)} ${pick(ABSTRACT)}. ${
        i % 2 === 0
          ? `Treat it as a system: inputs you control, behavior you observe, and a loop between them.`
          : `A useful test: if you removed it entirely, what would break first? That tells you where it actually sits.`
      }`,
    );
  }

  paras.push(pick(CLOSERS));
  const text = paras.join("\n\n");

  const meta: RunMeta = {
    node: pick(NODES),
    gpu: pick(GPUS),
    latencyLo: 58 + Math.floor(r() * 30),
    latencyHi: 96 + Math.floor(r() * 60),
    costUsdc: 0.001 + r() * 0.006,
    tokens: text.split(/\s+/).length,
  };
  return { text, meta };
}

export const PIPELINE = ["finding worker", "assigned", "executing", "streaming", "verified"] as const;
export type PipelineStage = (typeof PIPELINE)[number];
