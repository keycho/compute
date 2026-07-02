// mesh generation + rendering: luminous nodes and faint edge filaments.
// nodes render as soft additive sprites, edges as low-alpha line segments.

import * as THREE from 'three'
import { MESH, MOBILE, PALETTE } from '../config'
import { mulberry32 } from '../util'

export interface MeshData {
  positions: Float32Array
  nodeCount: number
  sizes: Float32Array
  edges: Array<[number, number]>
  /** node index -> indices into `edges` touching that node */
  adjacency: number[][]
}

function gauss(rand: () => number): number {
  // box-muller, one sample
  const u = Math.max(rand(), 1e-6)
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function buildMeshData(mobile: boolean): MeshData {
  const rand = mulberry32(MESH.seed)
  const perCluster = mobile ? MOBILE.nodesPerCluster : MESH.nodesPerCluster
  const scatterCount = mobile ? MOBILE.scatterNodes : MESH.scatterNodes
  const nodeCount = MESH.clusterCount * perCluster + scatterCount

  const positions = new Float32Array(nodeCount * 3)
  const sizes = new Float32Array(nodeCount)
  const clusterOf = new Int16Array(nodeCount)

  // cluster centers on a squashed shell - a loose galactic ellipsoid
  const centers: THREE.Vector3[] = []
  for (let c = 0; c < MESH.clusterCount; c++) {
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)
    const r = MESH.clusterRadius * (0.45 + rand() * 0.55)
    centers.push(
      new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) * 0.55,
        r * Math.sin(phi) * Math.sin(theta),
      ),
    )
  }

  let i = 0
  for (let c = 0; c < MESH.clusterCount; c++) {
    for (let k = 0; k < perCluster; k++, i++) {
      const spread = MESH.clusterSpread * (0.55 + rand() * 0.45)
      positions[i * 3 + 0] = centers[c].x + gauss(rand) * spread
      positions[i * 3 + 1] = centers[c].y + gauss(rand) * spread * 0.6
      positions[i * 3 + 2] = centers[c].z + gauss(rand) * spread
      clusterOf[i] = c
      // first node of each cluster is a hub
      sizes[i] = k === 0 ? 2.4 + rand() * 0.8 : 0.8 + rand() * 0.9
    }
  }
  for (let k = 0; k < scatterCount; k++, i++) {
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)
    const r = MESH.scatterRadius * Math.cbrt(rand())
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.5
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    clusterOf[i] = -1
    sizes[i] = 0.55 + rand() * 0.5
  }

  // edges: k nearest within cluster, sparse long-range links, scatter tendrils
  const edges: Array<[number, number]> = []
  const seen = new Set<number>()
  const addEdge = (a: number, b: number) => {
    if (a === b) return
    const key = a < b ? a * nodeCount + b : b * nodeCount + a
    if (seen.has(key)) return
    seen.add(key)
    edges.push(a < b ? [a, b] : [b, a])
  }

  const d2 = (a: number, b: number): number => {
    const dx = positions[a * 3] - positions[b * 3]
    const dy = positions[a * 3 + 1] - positions[b * 3 + 1]
    const dz = positions[a * 3 + 2] - positions[b * 3 + 2]
    return dx * dx + dy * dy + dz * dz
  }

  for (let a = 0; a < nodeCount; a++) {
    if (clusterOf[a] === -1) continue
    const near: Array<{ b: number; d: number }> = []
    for (let b = 0; b < nodeCount; b++) {
      if (b === a || clusterOf[b] !== clusterOf[a]) continue
      near.push({ b, d: d2(a, b) })
    }
    near.sort((x, y) => x.d - y.d)
    for (let n = 0; n < Math.min(MESH.neighborLinks, near.length); n++) addEdge(a, near[n].b)
  }

  for (let l = 0; l < MESH.longRangeLinks; l++) {
    const ca = Math.floor(rand() * MESH.clusterCount)
    let cb = Math.floor(rand() * MESH.clusterCount)
    if (cb === ca) cb = (cb + 1) % MESH.clusterCount
    const a = ca * perCluster + Math.floor(rand() * perCluster)
    const b = cb * perCluster + Math.floor(rand() * perCluster)
    addEdge(a, b)
  }

  const scatterStart = MESH.clusterCount * perCluster
  for (let a = scatterStart; a < nodeCount; a++) {
    if (rand() > 0.6) continue
    let best = -1
    let bestD = Infinity
    for (let b = 0; b < scatterStart; b++) {
      const d = d2(a, b)
      if (d < bestD) {
        bestD = d
        best = b
      }
    }
    if (best >= 0) addEdge(a, best)
  }

  const adjacency: number[][] = Array.from({ length: nodeCount }, () => [])
  edges.forEach(([a, b], e) => {
    adjacency[a].push(e)
    adjacency[b].push(e)
  })

  return { positions, nodeCount, sizes, edges, adjacency }
}

/* ------------------------------------------------------------------ */

const NODE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute float aMix;
  uniform float uTime;
  uniform float uDpr;
  varying float vMix;
  varying float vFade;
  void main() {
    vMix = aMix;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float pulse = 0.78 + 0.22 * sin(uTime * (0.5 + aSeed * 1.6) + aSeed * 43.0);
    float size = aSize * pulse * uDpr * 300.0 / max(14.0, -mv.z);
    gl_PointSize = min(size, 40.0 * uDpr);
    vFade = exp(-max(0.0, -mv.z - 34.0) * 0.0075);
    gl_Position = projectionMatrix * mv;
  }
`

const NODE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uBright;
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uCore;
  varying float vMix;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    float glow = pow(1.0 - d, 2.6);
    float core = pow(max(0.0, 1.0 - d * 1.7), 7.0);
    vec3 col = mix(uColA, uColB, vMix) * glow + uCore * core;
    gl_FragColor = vec4(col * uBright * vFade, glow * 0.85 + core);
  }
`

const EDGE_VERT = /* glsl */ `
  attribute float aSeed;
  varying float vSeed;
  varying float vFade;
  void main() {
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vFade = exp(-max(0.0, -mv.z - 34.0) * 0.008);
    gl_Position = projectionMatrix * mv;
  }
`

const EDGE_FRAG = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uBright;
  uniform vec3 uColA;
  uniform vec3 uColB;
  varying float vSeed;
  varying float vFade;
  void main() {
    float flicker = 0.7 + 0.3 * sin(uTime * (0.4 + vSeed * 0.8) + vSeed * 91.0);
    vec3 col = mix(uColA, uColB, vSeed);
    gl_FragColor = vec4(col * uBright * vFade, 0.16 * flicker);
  }
`

export class NetworkMesh {
  readonly group = new THREE.Group()
  private readonly nodeMat: THREE.ShaderMaterial
  private readonly edgeMat: THREE.ShaderMaterial

  constructor(data: MeshData, dpr: number) {
    const rand = mulberry32(MESH.seed ^ 0x9e37)

    // nodes
    const nodeGeo = new THREE.BufferGeometry()
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
    nodeGeo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1))
    const seeds = new Float32Array(data.nodeCount)
    const mixes = new Float32Array(data.nodeCount)
    for (let i = 0; i < data.nodeCount; i++) {
      seeds[i] = rand()
      mixes[i] = rand() * rand() // bias toward blue
    }
    nodeGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    nodeGeo.setAttribute('aMix', new THREE.BufferAttribute(mixes, 1))

    this.nodeMat = new THREE.ShaderMaterial({
      vertexShader: NODE_VERT,
      fragmentShader: NODE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uDpr: { value: dpr },
        uBright: { value: 1 },
        uColA: { value: new THREE.Color(PALETTE.blue) },
        uColB: { value: new THREE.Color(PALETTE.violet) },
        uCore: { value: new THREE.Color(PALETTE.white) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.group.add(new THREE.Points(nodeGeo, this.nodeMat))

    // edges
    const edgeGeo = new THREE.BufferGeometry()
    const ePos = new Float32Array(data.edges.length * 6)
    const eSeed = new Float32Array(data.edges.length * 2)
    data.edges.forEach(([a, b], e) => {
      ePos.set(data.positions.subarray(a * 3, a * 3 + 3), e * 6)
      ePos.set(data.positions.subarray(b * 3, b * 3 + 3), e * 6 + 3)
      const s = rand()
      eSeed[e * 2] = s
      eSeed[e * 2 + 1] = s
    })
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3))
    edgeGeo.setAttribute('aSeed', new THREE.BufferAttribute(eSeed, 1))

    this.edgeMat = new THREE.ShaderMaterial({
      vertexShader: EDGE_VERT,
      fragmentShader: EDGE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uBright: { value: 1 },
        uColA: { value: new THREE.Color(PALETTE.blue) },
        uColB: { value: new THREE.Color(PALETTE.violet) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.group.add(new THREE.LineSegments(edgeGeo, this.edgeMat))
  }

  setDpr(dpr: number): void {
    this.nodeMat.uniforms.uDpr.value = dpr
  }

  update(time: number, brightness: number): void {
    this.nodeMat.uniforms.uTime.value = time
    this.nodeMat.uniforms.uBright.value = brightness
    this.edgeMat.uniforms.uTime.value = time
    this.edgeMat.uniforms.uBright.value = brightness
  }
}
