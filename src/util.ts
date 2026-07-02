// small math + rng helpers shared across gl and ui modules.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v

export const clamp01 = (v: number): number => clamp(v, 0, 1)

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

// frame-rate independent exponential damping
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))

export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

// maps x in [e0, e1] to [0, 1] with smootherstep easing
export const smootherstep = (e0: number, e1: number, x: number): number => {
  const t = clamp01((x - e0) / (e1 - e0))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

// formats an integer with thin group separators: 14208 -> "14 208"
export function formatGroups(n: number): string {
  const s = Math.round(n).toString()
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ' '
    out += s[i]
  }
  return out
}

export const isMobile = (): boolean =>
  window.matchMedia('(max-width: 720px)').matches || navigator.maxTouchPoints > 2

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// short random hex id like "0x81f3…c2a4"
export function hexId(rand: () => number): string {
  const hex = () =>
    Math.floor(rand() * 0xffff)
      .toString(16)
      .padStart(4, '0')
  return `0x${hex()}…${hex()}`
}
