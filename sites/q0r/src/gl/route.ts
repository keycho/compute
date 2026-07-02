// the execution-path highlight for the system section. one job is followed
// end to end: submit (origin flares), route (the path draws in), execute
// (a packet travels it), verify (echo pulses + a finality ring at the
// destination). the whole thing is scrubbed by scroll, not by time, so the
// visualization is tied to navigation.

import * as THREE from 'three'
import { PALETTE } from '../config'
import { clamp01, mulberry32, smootherstep, smoothstep } from '../util'
import type { MeshData } from './network'

const BEAD_COUNT = 150
const HOPS = 4

const BEAD_VERT = /* glsl */ `
  attribute float aT;
  uniform float uDpr;
  uniform float uDraw;
  uniform float uHead;
  uniform float uEcho;
  uniform float uFlash;
  uniform float uMaster;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float visible = 1.0 - smoothstep(uDraw, uDraw + 0.02, aT);
    float head = exp(-abs(aT - uHead) * 22.0);
    float echo = exp(-abs(aT - uEcho) * 16.0) * 0.7;
    float body = 0.28;
    vAlpha = visible * (body + head * 1.6 + echo + uFlash * 0.5) * uMaster;
    float size = (1.5 + head * 2.5 + echo * 1.6) * uDpr * 300.0 / max(14.0, -mv.z);
    gl_PointSize = min(size, 30.0 * uDpr);
    gl_Position = projectionMatrix * mv;
  }
`

const BEAD_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    float glow = pow(1.0 - d, 2.4);
    gl_FragColor = vec4(uColor * vAlpha, glow * vAlpha);
  }
`

const ANCHOR_VERT = /* glsl */ `
  attribute float aIdx;
  uniform float uDpr;
  uniform float uLit[${HOPS + 1}];
  varying float vLit;
  void main() {
    vLit = uLit[int(aIdx + 0.5)];
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float size = (2.0 + vLit * 4.5) * uDpr * 300.0 / max(14.0, -mv.z);
    gl_PointSize = min(size, 44.0 * uDpr);
    gl_Position = projectionMatrix * mv;
  }
`

const ANCHOR_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uCore;
  varying float vLit;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    float glow = pow(1.0 - d, 2.4);
    float core = pow(max(0.0, 1.0 - d * 1.5), 6.0);
    vec3 col = uColor * glow + uCore * core;
    gl_FragColor = vec4(col * vLit, (glow * 0.9 + core) * vLit);
  }
`

export class RouteHighlight {
  readonly group = new THREE.Group()
  /** world-space centroid of the chosen path, used to aim the camera */
  readonly center = new THREE.Vector3()

  private readonly beadMat: THREE.ShaderMaterial
  private readonly anchorMat: THREE.ShaderMaterial
  private readonly packet: THREE.Points
  private readonly packetMat: THREE.ShaderMaterial
  private readonly packetAttr: THREE.BufferAttribute
  private readonly ring: THREE.Mesh
  private readonly ringMat: THREE.MeshBasicMaterial
  private readonly pathPoints: THREE.Vector3[] = []
  private readonly cumLen: number[] = [0]
  private phase = -1

  constructor(data: MeshData) {
    const rand = mulberry32(4242)

    // walk the adjacency for a chain of HOPS+1 distinct nodes
    const chain = this.pickChain(data, rand)
    for (const idx of chain) {
      this.pathPoints.push(
        new THREE.Vector3(
          data.positions[idx * 3],
          data.positions[idx * 3 + 1],
          data.positions[idx * 3 + 2],
        ),
      )
    }
    for (const p of this.pathPoints) this.center.add(p)
    this.center.divideScalar(this.pathPoints.length)

    for (let i = 1; i < this.pathPoints.length; i++) {
      this.cumLen.push(this.cumLen[i - 1] + this.pathPoints[i].distanceTo(this.pathPoints[i - 1]))
    }

    // beads along the polyline
    const beadPos = new Float32Array(BEAD_COUNT * 3)
    const beadT = new Float32Array(BEAD_COUNT)
    for (let i = 0; i < BEAD_COUNT; i++) {
      const t = i / (BEAD_COUNT - 1)
      const p = this.pointAt(t)
      beadPos.set([p.x, p.y, p.z], i * 3)
      beadT[i] = t
    }
    const beadGeo = new THREE.BufferGeometry()
    beadGeo.setAttribute('position', new THREE.BufferAttribute(beadPos, 3))
    beadGeo.setAttribute('aT', new THREE.BufferAttribute(beadT, 1))

    this.beadMat = new THREE.ShaderMaterial({
      vertexShader: BEAD_VERT,
      fragmentShader: BEAD_FRAG,
      uniforms: {
        uDpr: { value: 1 },
        uDraw: { value: 0 },
        uHead: { value: -1 },
        uEcho: { value: -1 },
        uFlash: { value: 0 },
        uMaster: { value: 0 },
        uColor: { value: new THREE.Color(PALETTE.cyan) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.group.add(new THREE.Points(beadGeo, this.beadMat))

    // anchor nodes
    const anchorPos = new Float32Array(this.pathPoints.length * 3)
    const anchorIdx = new Float32Array(this.pathPoints.length)
    this.pathPoints.forEach((p, i) => {
      anchorPos.set([p.x, p.y, p.z], i * 3)
      anchorIdx[i] = i
    })
    const anchorGeo = new THREE.BufferGeometry()
    anchorGeo.setAttribute('position', new THREE.BufferAttribute(anchorPos, 3))
    anchorGeo.setAttribute('aIdx', new THREE.BufferAttribute(anchorIdx, 1))

    this.anchorMat = new THREE.ShaderMaterial({
      vertexShader: ANCHOR_VERT,
      fragmentShader: ANCHOR_FRAG,
      uniforms: {
        uDpr: { value: 1 },
        uLit: { value: new Array(HOPS + 1).fill(0) },
        uColor: { value: new THREE.Color(PALETTE.blueSoft) },
        uCore: { value: new THREE.Color(PALETTE.white) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.group.add(new THREE.Points(anchorGeo, this.anchorMat))

    // travelling packet (single sprite, position updated per frame)
    const pkGeo = new THREE.BufferGeometry()
    this.packetAttr = new THREE.BufferAttribute(new Float32Array(3), 3)
    this.packetAttr.setUsage(THREE.DynamicDrawUsage)
    pkGeo.setAttribute('position', this.packetAttr)
    pkGeo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array([0]), 1))
    pkGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 400)
    this.packetMat = new THREE.ShaderMaterial({
      vertexShader: BEAD_VERT,
      fragmentShader: BEAD_FRAG,
      uniforms: {
        uDpr: { value: 1 },
        uDraw: { value: 2 },
        uHead: { value: 0 },
        uEcho: { value: -1 },
        uFlash: { value: 0 },
        uMaster: { value: 0 },
        uColor: { value: new THREE.Color(PALETTE.white) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.packet = new THREE.Points(pkGeo, this.packetMat)
    this.group.add(this.packet)

    // finality ring at the destination
    this.ringMat = new THREE.MeshBasicMaterial({
      color: PALETTE.cyan,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 56), this.ringMat)
    this.ring.position.copy(this.pathPoints[this.pathPoints.length - 1])
    this.group.add(this.ring)

    this.group.visible = false
  }

  private pickChain(data: MeshData, rand: () => number): number[] {
    for (let attempt = 0; attempt < 40; attempt++) {
      const start = Math.floor(rand() * data.nodeCount)
      const chain = [start]
      let node = start
      while (chain.length < HOPS + 1) {
        const options = data.adjacency[node].filter((e) => {
          const [a, b] = data.edges[e]
          const next = a === node ? b : a
          return !chain.includes(next)
        })
        if (options.length === 0) break
        const e = options[Math.floor(rand() * options.length)]
        const [a, b] = data.edges[e]
        node = a === node ? b : a
        chain.push(node)
      }
      if (chain.length === HOPS + 1) return chain
    }
    // degenerate mesh fallback: first HOPS+1 nodes
    return Array.from({ length: HOPS + 1 }, (_, i) => i % data.nodeCount)
  }

  private readonly tmpV = new THREE.Vector3()

  private pointAt(t: number): THREE.Vector3 {
    const total = this.cumLen[this.cumLen.length - 1]
    const target = clamp01(t) * total
    let seg = 0
    while (seg < this.cumLen.length - 2 && this.cumLen[seg + 1] < target) seg++
    const span = this.cumLen[seg + 1] - this.cumLen[seg]
    const local = span > 0 ? (target - this.cumLen[seg]) / span : 0
    return this.tmpV.lerpVectors(this.pathPoints[seg], this.pathPoints[seg + 1], local)
  }

  setDpr(dpr: number): void {
    this.beadMat.uniforms.uDpr.value = dpr
    this.anchorMat.uniforms.uDpr.value = dpr
    this.packetMat.uniforms.uDpr.value = dpr
  }

  /** t < 0 disables the highlight; t in [0,1] scrubs the four phases */
  setPhase(t: number): void {
    this.phase = t
    this.group.visible = t >= 0
  }

  update(time: number, cameraQuat: THREE.Quaternion): void {
    if (this.phase < 0) return
    const t = clamp01(this.phase)
    const master = smoothstep(0, 0.05, t) * (1 - smoothstep(0.96, 1, t))
    const s = t * 4
    const s0 = clamp01(s) // submit
    const s1 = clamp01(s - 1) // route
    const s2 = clamp01(s - 2) // execute
    const s3 = clamp01(s - 3) // verify

    const lit = this.anchorMat.uniforms.uLit.value as number[]
    // origin lights on submit; intermediate hops light as the path draws;
    // destination lights on packet arrival
    const draw = smootherstep(0, 1, s1)
    lit[0] = smootherstep(0, 0.7, s0) * (0.7 + 0.3 * Math.sin(time * 2.2)) * master
    for (let i = 1; i < HOPS; i++) {
      const at = i / HOPS
      lit[i] = smoothstep(at - 0.06, at + 0.06, draw) * 0.55 * master
    }
    const arrive = smoothstep(0.9, 1, s2)
    lit[HOPS] =
      (arrive * (0.85 + 0.15 * Math.sin(time * 3.1)) + smoothstep(0, 0.4, s3) * 0.2) * master

    this.beadMat.uniforms.uDraw.value = draw
    this.beadMat.uniforms.uMaster.value = master

    // execute: packet runs the path
    const headT = smootherstep(0, 1, s2)
    this.beadMat.uniforms.uHead.value = s2 > 0 && s2 < 1 ? headT : -1
    const pk = this.pointAt(headT)
    ;(this.packetAttr.array as Float32Array).set([pk.x, pk.y, pk.z], 0)
    this.packetAttr.needsUpdate = true
    this.packetMat.uniforms.uMaster.value = master * (s2 > 0 && s2 < 0.99 ? 1 : 0)

    // verify: echo pulse travels back, ring expands at destination
    const echoT = s3 > 0 ? 1 - smootherstep(0, 0.7, s3) : -1
    this.beadMat.uniforms.uEcho.value = echoT
    const flash = smoothstep(0.7, 0.85, s3) * (1 - smoothstep(0.85, 1, s3))
    this.beadMat.uniforms.uFlash.value = flash

    const ringT = smootherstep(0.05, 0.9, s3)
    this.ring.scale.setScalar(0.5 + ringT * 9)
    this.ringMat.opacity = s3 > 0 ? (1 - ringT) * 0.7 * master : 0
    this.ring.quaternion.copy(cameraQuat)
  }
}
