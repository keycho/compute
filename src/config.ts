// central tunables for the q0r experience.
// palette values are mirrored in src/styles/main.css custom properties.

export const PALETTE = {
  bg: 0x030409,
  blue: 0x5b8cff,
  blueSoft: 0x7da2ff,
  violet: 0xa78bfa,
  cyan: 0x9fd8ff,
  white: 0xdbe6ff,
} as const

export const MESH = {
  seed: 41,
  clusterCount: 11,
  clusterRadius: 58,
  clusterSpread: 13,
  nodesPerCluster: 30,
  scatterNodes: 96,
  scatterRadius: 78,
  longRangeLinks: 26,
  neighborLinks: 3,
} as const

export const SIGNALS = {
  count: 130,
  trail: 4,
  minSpeed: 0.10,
  maxSpeed: 0.34,
} as const

export const DUST = {
  count: 900,
  radius: 320,
} as const

export const RENDER = {
  maxDpr: 1.75,
  mobileDpr: 1.25,
  bloomStrength: 1.05,
  bloomRadius: 0.85,
  bloomThreshold: 0.08,
  fogDensity: 0.0068,
} as const

// reduced counts for narrow / low-power devices
export const MOBILE = {
  nodesPerCluster: 18,
  scatterNodes: 48,
  signalCount: 70,
  dustCount: 400,
} as const
