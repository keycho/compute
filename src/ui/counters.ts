// hero + footer live metrics. values random-walk inside plausible bands so
// the network reads as operational without ever jumping implausibly.

import { clamp, formatGroups, prefersReducedMotion } from '../util'

interface Counter {
  els: HTMLElement[]
  value: number
  min: number
  max: number
  step: number
  intervalMs: number
  next: number
  format: (v: number) => string
}

export function startCounters(): void {
  const grab = (...names: string[]): HTMLElement[] =>
    names
      .map((n) => document.querySelector<HTMLElement>(`[data-counter="${n}"]`))
      .filter((el): el is HTMLElement => el !== null)

  const counters: Counter[] = [
    {
      els: grab('nodes'),
      value: 14208,
      min: 14100,
      max: 14340,
      step: 6,
      intervalMs: 2100,
      next: 0,
      format: formatGroups,
    },
    {
      els: grab('jobs'),
      value: 3412,
      min: 3050,
      max: 3900,
      step: 26,
      intervalMs: 420,
      next: 0,
      format: formatGroups,
    },
    {
      els: grab('p50'),
      value: 38,
      min: 31,
      max: 47,
      step: 3,
      intervalMs: 1300,
      next: 0,
      format: (v) => Math.round(v).toString(),
    },
    {
      els: grab('epoch', 'epoch2', 'epoch3'),
      value: 2841,
      min: 2841,
      max: 2999,
      step: 1,
      intervalMs: 90000,
      next: 0,
      format: formatGroups,
    },
  ]

  if (prefersReducedMotion()) return

  const tick = (now: number): void => {
    for (const c of counters) {
      if (now < c.next) continue
      c.next = now + c.intervalMs * (0.6 + Math.random() * 0.8)
      c.value = clamp(c.value + (Math.random() * 2 - 1) * c.step, c.min, c.max)
      const text = c.format(c.value)
      for (const el of c.els) {
        if (el.textContent !== text) el.textContent = text
      }
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
