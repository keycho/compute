// ambient job traffic: bright packets travelling the mesh edges with
// short trails. packets continue through nodes along adjacent edges,
// reading as sustained flows rather than isolated blips.

import * as THREE from 'three'
import { MOBILE, PALETTE, SIGNALS } from '../config'
import { mulberry32 } from '../util'
import type { MeshData } from './network'

const VERT = /* glsl */ `
  attribute float aGhost;
  uniform float uDpr;
  varying float vGhost;
  varying float vFade;
  void main() {
    vGhost = aGhost;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float factor = pow(0.62, aGhost);
    float size = 2.6 * factor * uDpr * 300.0 / max(14.0, -mv.z);
    gl_PointSize = min(size, 26.0 * uDpr);
    vFade = exp(-max(0.0, -mv.z - 34.0) * 0.0075);
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uBright;
  uniform vec3 uHead;
  uniform vec3 uTail;
  varying float vGhost;
  varying float vFade;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    float glow = pow(1.0 - d, 3.0);
    float w = pow(0.55, vGhost);
    vec3 col = mix(uTail, uHead, w);
    gl_FragColor = vec4(col * uBright * vFade * w, glow * w);
  }
`

interface SignalState {
  edge: number
  /** travelling from edge[0] to edge[1] when 1, reversed when -1 */
  dir: 1 | -1
  t: number
  /** world units per second */
  speed: number
  edgeLen: number
}

const HIST_SLOTS = 16
const HIST_STRIDE = 3 // frames between trail samples

export class SignalFlow {
  readonly points: THREE.Points
  private readonly mat: THREE.ShaderMaterial
  private readonly data: MeshData
  private readonly rand: () => number
  private readonly count: number
  private readonly state: SignalState[] = []
  private readonly history: Float32Array
  private readonly histHead: Int32Array
  private readonly posAttr: THREE.BufferAttribute
  private frame = 0

  constructor(data: MeshData, dpr: number, mobile: boolean) {
    this.data = data
    this.rand = mulberry32(1337)
    this.count = mobile ? MOBILE.signalCount : SIGNALS.count

    const verts = this.count * SIGNALS.trail
    const positions = new Float32Array(verts * 3)
    const ghosts = new Float32Array(verts)
    for (let i = 0; i < this.count; i++) {
      for (let g = 0; g < SIGNALS.trail; g++) ghosts[i * SIGNALS.trail + g] = g
    }

    const geo = new THREE.BufferGeometry()
    this.posAttr = new THREE.BufferAttribute(positions, 3)
    this.posAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', this.posAttr)
    geo.setAttribute('aGhost', new THREE.BufferAttribute(ghosts, 1))
    // packets roam the whole mesh; skip per-frame bounds work
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 400)

    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uDpr: { value: dpr },
        uBright: { value: 1 },
        uHead: { value: new THREE.Color(PALETTE.white) },
        uTail: { value: new THREE.Color(PALETTE.blue) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(geo, this.mat)

    this.history = new Float32Array(this.count * HIST_SLOTS * 3)
    this.histHead = new Int32Array(this.count)
    for (let i = 0; i < this.count; i++) {
      this.spawn(i)
      const p = this.positionOf(i)
      for (let s = 0; s < HIST_SLOTS; s++) this.history.set(p, (i * HIST_SLOTS + s) * 3)
    }
  }

  private edgeLength(e: number): number {
    const [a, b] = this.data.edges[e]
    const p = this.data.positions
    const dx = p[a * 3] - p[b * 3]
    const dy = p[a * 3 + 1] - p[b * 3 + 1]
    const dz = p[a * 3 + 2] - p[b * 3 + 2]
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  private spawn(i: number, fromNode = -1): void {
    let edge: number
    let dir: 1 | -1
    if (fromNode >= 0 && this.data.adjacency[fromNode].length > 0) {
      const adj = this.data.adjacency[fromNode]
      edge = adj[Math.floor(this.rand() * adj.length)]
      dir = this.data.edges[edge][0] === fromNode ? 1 : -1
    } else {
      edge = Math.floor(this.rand() * this.data.edges.length)
      dir = this.rand() > 0.5 ? 1 : -1
    }
    this.state[i] = {
      edge,
      dir,
      t: 0,
      speed: 10 + this.rand() * 22,
      edgeLen: Math.max(this.edgeLength(edge), 0.001),
    }
  }

  private readonly tmp: [number, number, number] = [0, 0, 0]

  private positionOf(i: number): [number, number, number] {
    const s = this.state[i]
    const [a, b] = this.data.edges[s.edge]
    const from = s.dir === 1 ? a : b
    const to = s.dir === 1 ? b : a
    const p = this.data.positions
    this.tmp[0] = p[from * 3] + (p[to * 3] - p[from * 3]) * s.t
    this.tmp[1] = p[from * 3 + 1] + (p[to * 3 + 1] - p[from * 3 + 1]) * s.t
    this.tmp[2] = p[from * 3 + 2] + (p[to * 3 + 2] - p[from * 3 + 2]) * s.t
    return this.tmp
  }

  update(dt: number, brightness: number): void {
    this.frame++
    const sample = this.frame % HIST_STRIDE === 0
    const arr = this.posAttr.array as Float32Array

    for (let i = 0; i < this.count; i++) {
      const s = this.state[i]
      s.t += (s.speed / s.edgeLen) * dt
      if (s.t >= 1) {
        const [a, b] = this.data.edges[s.edge]
        const arrived = s.dir === 1 ? b : a
        this.spawn(i, arrived)
      }
      const p = this.positionOf(i)

      if (sample) {
        const head = (this.histHead[i] + 1) % HIST_SLOTS
        this.histHead[i] = head
        this.history.set(p, (i * HIST_SLOTS + head) * 3)
      }

      // ghost 0 = live position, older ghosts read back through history
      arr.set(p, i * SIGNALS.trail * 3)
      for (let g = 1; g < SIGNALS.trail; g++) {
        const slot = (this.histHead[i] - g * 2 + HIST_SLOTS * 4) % HIST_SLOTS
        const src = (i * HIST_SLOTS + slot) * 3
        arr[(i * SIGNALS.trail + g) * 3] = this.history[src]
        arr[(i * SIGNALS.trail + g) * 3 + 1] = this.history[src + 1]
        arr[(i * SIGNALS.trail + g) * 3 + 2] = this.history[src + 2]
      }
    }

    this.posAttr.needsUpdate = true
    this.mat.uniforms.uBright.value = brightness
  }

  setDpr(dpr: number): void {
    this.mat.uniforms.uDpr.value = dpr
  }
}
