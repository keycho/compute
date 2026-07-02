// the operator console: a live 2d simulation of one provider node inside
// the mesh. inbound jobs arrive as energy packets; verified executions
// settle into the accrual readout and the activity stream. no tables,
// no admin chrome - the view IS the system state.

import { clamp, clamp01, hexId, lerp, mulberry32, prefersReducedMotion } from '../util'

const BLUE = '91, 140, 255'
const VIOLET = '167, 139, 250'
const CYAN = '159, 216, 255'
const WHITE = '219, 230, 255'
const GOOD = '110, 231, 183'

const GPU_TAGS = ['a100:1', 'a100:2', 'a100:4', 'h100:1', 'h100:8', 'l40s:2']

interface Peer {
  x: number
  y: number
  r: number
  seed: number
  /** ring: 1 = direct peer, 2 = far peer */
  ring: number
}

interface Packet {
  from: number
  t: number
  dur: number
  size: number
  outbound: boolean
}

interface Flare {
  age: number
  life: number
}

export class ConsoleSim {
  private readonly stage: HTMLCanvasElement
  private readonly util: HTMLCanvasElement
  private readonly wave: HTMLCanvasElement
  private readonly stream: HTMLElement
  private readonly utilPct: HTMLElement
  private readonly accrualEl: HTMLElement

  private readonly rand = mulberry32(90210)
  private peers: Peer[] = []
  private links: Array<[number, number]> = []
  private packets: Packet[] = []
  private flares: Flare[] = []
  private waveData: number[] = []
  private accrual = 412.906
  private utilValue = 87.3
  private utilTarget = 87.3
  private nextPacketAt = 0
  private nextUtilAt = 0
  private time = 0
  private last = -1
  private raf = 0
  private active = false
  private readonly reduced = prefersReducedMotion()

  constructor() {
    this.stage = document.getElementById('consoleCanvas') as HTMLCanvasElement
    this.util = document.getElementById('utilCanvas') as HTMLCanvasElement
    this.wave = document.getElementById('waveCanvas') as HTMLCanvasElement
    this.stream = document.getElementById('stream')!
    this.utilPct = document.getElementById('utilPct')!
    this.accrualEl = document.getElementById('accrualV')!

    this.layout()
    window.addEventListener('resize', () => this.layout())

    for (let i = 0; i < 26; i++) this.waveData.push(0.2 + this.rand() * 0.25)
    for (let i = 0; i < 5; i++) this.pushRow(true)

    // run only while the console is on screen
    const frame = document.getElementById('consoleFrame')!
    new IntersectionObserver(
      (entries) => {
        for (const e of entries) this.setActive(e.isIntersecting)
      },
      { threshold: 0.1 },
    ).observe(frame)

    this.installTilt(frame)
  }

  /* ---------- layout ---------- */

  private layout(): void {
    const rect = this.stage.parentElement!.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.stage.width = Math.max(rect.width, 10) * dpr
    this.stage.height = Math.max(rect.height, 10) * dpr

    const udpr = Math.min(window.devicePixelRatio || 1, 2)
    this.util.width = 120 * udpr
    this.util.height = 120 * udpr
    const wrect = this.wave.getBoundingClientRect()
    this.wave.width = Math.max(wrect.width, 10) * udpr
    this.wave.height = 42 * udpr

    // peer topology in normalized stage space
    const rand = mulberry32(555)
    this.peers = []
    this.links = []
    const ring1 = 7
    for (let i = 0; i < ring1; i++) {
      const a = (i / ring1) * Math.PI * 2 + rand() * 0.5
      const r = 0.30 + rand() * 0.08
      this.peers.push({
        x: 0.5 + Math.cos(a) * r * 1.25,
        y: 0.52 + Math.sin(a) * r,
        r: 3.2 + rand() * 2.2,
        seed: rand() * 10,
        ring: 1,
      })
      this.links.push([-1, i]) // -1 = center
    }
    const ring2 = 6
    for (let i = 0; i < ring2; i++) {
      const a = (i / ring2) * Math.PI * 2 + 0.4 + rand() * 0.5
      const r = 0.46 + rand() * 0.05
      this.peers.push({
        x: 0.5 + Math.cos(a) * r * 1.3,
        y: 0.52 + Math.sin(a) * r,
        r: 2.0 + rand() * 1.4,
        seed: rand() * 10,
        ring: 2,
      })
      const nearest = Math.floor(rand() * ring1)
      this.links.push([nearest, ring1 + i])
    }
  }

  private setActive(on: boolean): void {
    if (on === this.active) return
    this.active = on
    cancelAnimationFrame(this.raf)
    if (on) {
      this.last = -1
      if (this.reduced) {
        this.drawStage(0)
        this.drawUtil()
        this.drawWave()
      } else {
        this.loop()
      }
    }
  }

  /* ---------- simulation ---------- */

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now() / 1000
    if (this.last < 0) this.last = now
    const dt = Math.min(now - this.last, 0.1)
    this.last = now
    this.time += dt

    if (this.time >= this.nextPacketAt) {
      this.nextPacketAt = this.time + 0.45 + this.rand() * 0.9
      const outbound = this.rand() < 0.22
      this.packets.push({
        from: Math.floor(this.rand() * this.peers.length),
        t: 0,
        dur: 1.1 + this.rand() * 1.2,
        size: 1.4 + this.rand() * 1.6,
        outbound,
      })
    }

    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i]
      p.t += dt / p.dur
      if (p.t >= 1) {
        this.packets.splice(i, 1)
        if (!p.outbound) this.settle(p.size)
      }
    }

    for (let i = this.flares.length - 1; i >= 0; i--) {
      this.flares[i].age += dt
      if (this.flares[i].age > this.flares[i].life) this.flares.splice(i, 1)
    }

    if (this.time >= this.nextUtilAt) {
      this.nextUtilAt = this.time + 2 + this.rand() * 3
      this.utilTarget = clamp(this.utilTarget + (this.rand() * 2 - 1) * 4, 74, 96)
    }
    this.utilValue = lerp(this.utilValue, this.utilTarget, 1 - Math.exp(-1.2 * dt))
    this.utilPct.textContent = this.utilValue.toFixed(1)

    // passive accrual drip on top of settled jobs
    this.accrual += dt * 0.0008
    this.accrualEl.textContent = this.accrual.toFixed(3)

    this.drawStage(this.time)
    this.drawUtil()
    this.drawWave()
  }

  private settle(size: number): void {
    const pay = 0.04 + this.rand() * 0.3 * size * 0.4
    this.accrual += pay
    this.flares.push({ age: 0, life: 0.9 })
    this.waveData.push(clamp01(0.25 + pay * 1.8))
    if (this.waveData.length > 26) this.waveData.shift()
    this.pushRow(false, pay)
  }

  private pushRow(initial: boolean, pay?: number): void {
    const amount = pay ?? 0.05 + this.rand() * 0.3
    const row = document.createElement('div')
    row.className = 'row'
    if (initial) row.style.animationDelay = '0s'
    const gpu = GPU_TAGS[Math.floor(this.rand() * GPU_TAGS.length)]
    const secs = Math.round(8 + this.rand() * 220)
    row.innerHTML =
      `<i></i><span class="r-id">${hexId(this.rand)}</span>` +
      `<span>${gpu}</span><span>${secs}s</span>` +
      `<span class="r-pay">+${amount.toFixed(2)} q0r</span>`
    this.stream.prepend(row)
    while (this.stream.children.length > 7) this.stream.lastElementChild!.remove()
  }

  /* ---------- drawing ---------- */

  private drawStage(time: number): void {
    const ctx = this.stage.getContext('2d')!
    const w = this.stage.width
    const h = this.stage.height
    ctx.clearRect(0, 0, w, h)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cx = 0.5 * w
    const cy = 0.52 * h

    const px = (nx: number): number => nx * w
    const py = (ny: number): number => ny * h

    // links
    ctx.lineWidth = 1 * dpr
    for (const [a, b] of this.links) {
      const ax = a === -1 ? cx : px(this.peers[a].x)
      const ay = a === -1 ? cy : py(this.peers[a].y)
      const bx = px(this.peers[b].x)
      const by = py(this.peers[b].y)
      const grad = ctx.createLinearGradient(ax, ay, bx, by)
      grad.addColorStop(0, `rgba(${BLUE}, 0.28)`)
      grad.addColorStop(1, `rgba(${VIOLET}, 0.10)`)
      ctx.strokeStyle = grad
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }

    // peers
    for (const peer of this.peers) {
      const pulse = 0.75 + 0.25 * Math.sin(time * (0.8 + peer.seed * 0.3) + peer.seed * 5)
      const r = peer.r * dpr * pulse
      const x = px(peer.x)
      const y = py(peer.y)
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5)
      const tint = peer.ring === 1 ? BLUE : VIOLET
      glow.addColorStop(0, `rgba(${tint}, ${0.5 * pulse})`)
      glow.addColorStop(1, `rgba(${tint}, 0)`)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, r * 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(${WHITE}, ${0.85 * pulse})`
      ctx.beginPath()
      ctx.arc(x, y, r * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }

    // center node + settle flares
    let flare = 0
    for (const f of this.flares) {
      const k = f.age / f.life
      flare += (1 - k) * 0.6
      const ringR = (10 + k * 46) * dpr
      ctx.strokeStyle = `rgba(${GOOD}, ${(1 - k) * 0.5})`
      ctx.lineWidth = 1.4 * dpr
      ctx.beginPath()
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
      ctx.stroke()
    }
    const breathe = 0.85 + 0.15 * Math.sin(time * 1.1)
    const cr = 7 * dpr * (breathe + flare * 0.4)
    const cglow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 7)
    cglow.addColorStop(0, `rgba(${CYAN}, ${0.65 + flare * 0.3})`)
    cglow.addColorStop(0.4, `rgba(${BLUE}, 0.25)`)
    cglow.addColorStop(1, `rgba(${BLUE}, 0)`)
    ctx.fillStyle = cglow
    ctx.beginPath()
    ctx.arc(cx, cy, cr * 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(${WHITE}, 0.95)`
    ctx.beginPath()
    ctx.arc(cx, cy, cr * 0.55, 0, Math.PI * 2)
    ctx.fill()

    // packets
    for (const p of this.packets) {
      const peer = this.peers[p.from]
      const ease = p.t * p.t * (3 - 2 * p.t)
      const k = p.outbound ? 1 - ease : ease
      const x = lerp(px(peer.x), cx, k)
      const y = lerp(py(peer.y), cy, k)
      const r = p.size * dpr
      const tint = p.outbound ? VIOLET : CYAN
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 6)
      glow.addColorStop(0, `rgba(${tint}, 0.9)`)
      glow.addColorStop(1, `rgba(${tint}, 0)`)
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, r * 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(${WHITE}, 0.95)`
      ctx.beginPath()
      ctx.arc(x, y, r * 0.9, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawUtil(): void {
    const ctx = this.util.getContext('2d')!
    const w = this.util.width
    const c = w / 2
    const r = w * 0.4
    ctx.clearRect(0, 0, w, w)
    ctx.lineWidth = w * 0.045
    ctx.lineCap = 'round'

    ctx.strokeStyle = `rgba(${BLUE}, 0.12)`
    ctx.beginPath()
    ctx.arc(c, c, r, -Math.PI / 2, Math.PI * 1.5)
    ctx.stroke()

    const frac = this.utilValue / 100
    const end = -Math.PI / 2 + frac * Math.PI * 2
    const grad = ctx.createConicGradient
      ? ctx.createConicGradient(-Math.PI / 2, c, c)
      : null
    if (grad) {
      grad.addColorStop(0, `rgba(${BLUE}, 0.95)`)
      grad.addColorStop(frac, `rgba(${VIOLET}, 0.95)`)
      ctx.strokeStyle = grad
    } else {
      ctx.strokeStyle = `rgba(${BLUE}, 0.95)`
    }
    ctx.shadowColor = `rgba(${BLUE}, 0.8)`
    ctx.shadowBlur = w * 0.06
    ctx.beginPath()
    ctx.arc(c, c, r, -Math.PI / 2, end)
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  private drawWave(): void {
    const ctx = this.wave.getContext('2d')!
    const w = this.wave.width
    const h = this.wave.height
    ctx.clearRect(0, 0, w, h)
    const n = this.waveData.length
    if (n < 2) return
    ctx.lineWidth = Math.min(window.devicePixelRatio || 1, 2) * 1.2
    ctx.strokeStyle = `rgba(${VIOLET}, 0.9)`
    ctx.shadowColor = `rgba(${VIOLET}, 0.7)`
    ctx.shadowBlur = 6
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w
      const y = h - this.waveData[i] * (h * 0.82) - h * 0.09
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  /* ---------- tilt ---------- */

  private installTilt(frame: HTMLElement): void {
    if (this.reduced || navigator.maxTouchPoints > 2) return
    const glass = document.getElementById('consoleGlass')!
    frame.addEventListener('pointermove', (e) => {
      const rect = frame.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / rect.width - 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5
      glass.style.transform = `rotateY(${nx * 4}deg) rotateX(${ny * -3}deg)`
    })
    frame.addEventListener('pointerleave', () => {
      glass.style.transform = 'rotateY(0deg) rotateX(0deg)'
    })
  }
}
