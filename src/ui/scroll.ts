// scroll choreography: measures section anchors into camera stops, exposes
// global progress + the system section's local progress, drives reveals,
// step activation, the nav state, and the side rail.

import { clamp01 } from '../util'

export interface SectionAnchor {
  id: string
  /** global scroll progress (0..1) at which this section is centered */
  p: number
}

export interface ScrollState {
  /** global progress across the whole document, 0..1 */
  progress: number
  /** progress inside the system section's sticky span, 0..1, or -1 outside */
  sysLocal: number
  anchors: SectionAnchor[]
}

const SECTION_IDS = ['hero', 'network', 'system', 'console', 'protocol', 'end']

export class ScrollManager {
  private anchorsList: SectionAnchor[] = []
  private sysTop = 0
  private sysSpan = 1
  private docSpan = 1
  private onChange: (s: ScrollState) => void
  private onRemeasure: (anchors: SectionAnchor[]) => void
  private railDots: HTMLElement[] = []
  private steps: HTMLElement[] = []
  private segs: HTMLElement[] = []
  private nav: HTMLElement

  constructor(
    onChange: (s: ScrollState) => void,
    onRemeasure: (anchors: SectionAnchor[]) => void,
  ) {
    this.onChange = onChange
    this.onRemeasure = onRemeasure
    this.nav = document.getElementById('nav')!
    this.railDots = Array.from(document.querySelectorAll<HTMLElement>('#rail i'))
    this.steps = Array.from(document.querySelectorAll<HTMLElement>('.sys-step'))
    this.segs = Array.from(document.querySelectorAll<HTMLElement>('.sys-progress i'))

    this.measure()
    window.addEventListener('scroll', () => this.emit(), { passive: true })
    window.addEventListener('resize', () => {
      this.measure()
      this.emit()
    })

    // reveal-on-scroll
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            observer.unobserve(e.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))

    this.emit()
  }

  private measure(): void {
    const vh = window.innerHeight
    this.docSpan = Math.max(document.documentElement.scrollHeight - vh, 1)

    this.anchorsList = SECTION_IDS.map((id) => {
      const el = document.getElementById(id)
      if (!el) return { id, p: 0 }
      if (id === 'hero') return { id, p: 0 }
      if (id === 'end') return { id, p: 1 }
      const center = el.offsetTop + el.offsetHeight * 0.5 - vh * 0.5
      return { id, p: clamp01(center / this.docSpan) }
    })

    const sys = document.getElementById('system')
    if (sys) {
      this.sysTop = sys.offsetTop
      this.sysSpan = Math.max(sys.offsetHeight - vh, 1)
    }

    this.onRemeasure(this.anchorsList)
  }

  private emit(): void {
    const y = window.scrollY
    const progress = clamp01(y / this.docSpan)
    const sysRaw = (y - this.sysTop) / this.sysSpan
    const sysLocal = sysRaw >= -0.08 && sysRaw <= 1.1 ? clamp01(sysRaw) : -1

    this.nav.classList.toggle('scrolled', y > 40)
    this.updateRail(progress)
    this.updateSteps(sysLocal)

    this.onChange({ progress, sysLocal, anchors: this.anchorsList })
  }

  private updateRail(progress: number): void {
    let nearest = 0
    let bestD = Infinity
    this.anchorsList.forEach((a, i) => {
      if (a.id === 'end') return
      const d = Math.abs(a.p - progress)
      if (d < bestD) {
        bestD = d
        nearest = i
      }
    })
    this.railDots.forEach((dot, i) => dot.classList.toggle('on', i === nearest))
  }

  private updateSteps(sysLocal: number): void {
    if (sysLocal < 0) return
    const s = sysLocal * 4
    const active = Math.min(Math.floor(s), 3)
    this.steps.forEach((el, i) => {
      el.classList.toggle('active', i === active)
      el.classList.toggle('past', i < active)
    })
    this.segs.forEach((el, i) => {
      el.style.setProperty('--fill', clamp01(s - i).toFixed(3))
    })
  }
}
