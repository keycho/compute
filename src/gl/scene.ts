// the q0r world: one persistent scene behind the document. scroll drives a
// damped camera path through the mesh; sections tune brightness and bloom.

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { PALETTE, RENDER } from '../config'
import { clamp01, damp, isMobile, smootherstep } from '../util'
import { buildMeshData, NetworkMesh } from './network'
import { SignalFlow } from './signals'
import { Atmosphere } from './atmosphere'
import { RouteHighlight } from './route'

export interface CameraStop {
  p: number
  pos: THREE.Vector3
  look: THREE.Vector3
  bright: number
  bloom: number
}

// display-space finishing: chromatic fringe at the edges + vignette + a
// faint blue lift in the shadows so black never reads as dead
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5;
      float r2 = dot(d, d);
      vec2 ca = d * r2 * 0.007;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + ca).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - ca).b;
      float vig = 1.0 - smoothstep(0.3, 0.95, sqrt(r2)) * 0.45;
      col *= vig;
      col += vec3(0.008, 0.012, 0.028) * (1.0 - col);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

export class QorWorld {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass

  private readonly network: NetworkMesh
  private readonly signals: SignalFlow
  private readonly atmosphere: Atmosphere
  readonly route: RouteHighlight

  private stops: CameraStop[] = []
  private targetP = 0
  private p = 0
  private pointerX = 0
  private pointerY = 0
  private px = 0
  private py = 0
  private routePhase = -1
  private time = 0
  private last = -1
  private raf = 0
  private running = false
  /** 0 freezes ambient motion (reduced-motion); 1 is normal */
  timeScale = 1

  private readonly curPos = new THREE.Vector3(0, 6, 132)
  private readonly curLook = new THREE.Vector3(0, 2, 0)
  private readonly tmpPos = new THREE.Vector3()
  private readonly tmpLook = new THREE.Vector3()

  constructor(canvas: HTMLCanvasElement) {
    const mobile = isMobile()

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(PALETTE.bg, 1)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? RENDER.mobileDpr : RENDER.maxDpr)
    this.renderer.setPixelRatio(dpr)

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.5,
      900,
    )
    this.camera.position.copy(this.curPos)

    const data = buildMeshData(mobile)
    this.network = new NetworkMesh(data, dpr)
    this.signals = new SignalFlow(data, dpr, mobile)
    this.atmosphere = new Atmosphere(mobile)
    this.route = new RouteHighlight(data)
    this.route.setDpr(dpr)

    this.scene.add(this.network.group, this.signals.points, this.atmosphere.group, this.route.group)

    this.composer = new EffectComposer(this.renderer)
    this.composer.setPixelRatio(dpr)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      RENDER.bloomStrength,
      RENDER.bloomRadius,
      RENDER.bloomThreshold,
    )
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.composer.addPass(new ShaderPass(GradeShader))

    this.resize()
    window.addEventListener('resize', () => this.resize())
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause()
      else if (this.running) this.loop()
    })
  }

  setStops(stops: CameraStop[]): void {
    this.stops = [...stops].sort((a, b) => a.p - b.p)
  }

  setProgress(p: number): void {
    this.targetP = clamp01(p)
  }

  setPointer(x: number, y: number): void {
    this.pointerX = x
    this.pointerY = y
  }

  setRoutePhase(t: number): void {
    this.routePhase = t
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.last = -1
    this.loop()
  }

  private pause(): void {
    cancelAnimationFrame(this.raf)
    this.last = -1
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now() / 1000
    if (this.last < 0) this.last = now
    const dt = Math.min(now - this.last, 1 / 20)
    this.last = now
    this.time += dt * this.timeScale

    // damped scroll + pointer
    this.p = damp(this.p, this.targetP, 3.4, dt)
    this.px = damp(this.px, this.pointerX, 2.6, dt)
    this.py = damp(this.py, this.pointerY, 2.6, dt)

    const { pos, look, bright, bloom } = this.sample(this.p)

    // idle drift keeps the frame alive even without input
    const drift = this.timeScale
    pos.x += Math.sin(this.time * 0.11) * 1.4 * drift + this.px * 5
    pos.y += Math.cos(this.time * 0.09) * 0.9 * drift + this.py * -3
    look.x += this.px * 2
    look.y += this.py * -1.2

    this.curPos.copy(pos)
    this.curLook.copy(look)
    this.camera.position.copy(this.curPos)
    this.camera.lookAt(this.curLook)
    this.camera.rotateZ(this.px * 0.02)

    this.network.update(this.time, bright)
    this.signals.update(dt * this.timeScale, bright)
    this.atmosphere.update(this.time)
    this.route.setPhase(this.routePhase)
    this.route.update(this.time, this.camera.quaternion)
    this.bloom.strength = bloom

    this.composer.render()
  }

  private sample(p: number): {
    pos: THREE.Vector3
    look: THREE.Vector3
    bright: number
    bloom: number
  } {
    const s = this.stops
    if (s.length === 0) {
      return { pos: this.tmpPos.copy(this.curPos), look: this.tmpLook.copy(this.curLook), bright: 1, bloom: RENDER.bloomStrength }
    }
    if (p <= s[0].p || s.length === 1) {
      return { pos: this.tmpPos.copy(s[0].pos), look: this.tmpLook.copy(s[0].look), bright: s[0].bright, bloom: s[0].bloom }
    }
    const lastStop = s[s.length - 1]
    if (p >= lastStop.p) {
      return { pos: this.tmpPos.copy(lastStop.pos), look: this.tmpLook.copy(lastStop.look), bright: lastStop.bright, bloom: lastStop.bloom }
    }
    let i = 0
    while (i < s.length - 2 && s[i + 1].p < p) i++
    const a = s[i]
    const b = s[i + 1]
    const t = smootherstep(a.p, b.p, p)
    return {
      pos: this.tmpPos.lerpVectors(a.pos, b.pos, t),
      look: this.tmpLook.lerpVectors(a.look, b.look, t),
      bright: a.bright + (b.bright - a.bright) * t,
      bloom: a.bloom + (b.bloom - a.bloom) * t,
    }
  }

  private resize(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      isMobile() ? RENDER.mobileDpr : RENDER.maxDpr,
    )
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h)
    this.composer.setPixelRatio(dpr)
    this.composer.setSize(w, h)
    this.network.setDpr(dpr)
    this.signals.setDpr(dpr)
    this.route.setDpr(dpr)
  }
}
