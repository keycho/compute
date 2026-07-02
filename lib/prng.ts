/**
 * Deterministic PRNG utilities.
 *
 * Every simulated surface in the app (telemetry, network topology, curves)
 * derives from seeded generators so server and client render identical first
 * frames, and reloads feel like reconnecting to the same live system rather
 * than a new random one.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gaussian-ish sample via central limit; cheap and good enough for ticks. */
export function gaussian(rand: () => number): number {
  return (rand() + rand() + rand() + rand() - 2) / 2;
}
