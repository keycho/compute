// boot sequence: a short protocol handshake before the world reveals.
// skippable on any input; instant under prefers-reduced-motion.

import { prefersReducedMotion } from '../util'

const LINES = [
  'q0r bootstrap v3.2.1',
  'establishing mesh link <i>ok</i>',
  'negotiating stake proofs <i>ok</i>',
  'syncing topology <em>14 208 nodes</em> <i>ok</i>',
  'attestation chain verified',
  'execution layer online',
]

const LINE_MS = 270

export function runBoot(onDone: () => void): void {
  const boot = document.getElementById('boot')!
  const log = document.getElementById('bootLog')!
  const bar = document.getElementById('bootBar')!
  const body = document.body

  body.classList.add('locked')

  let finished = false
  const finish = (): void => {
    if (finished) return
    finished = true
    bar.style.width = '100%'
    boot.classList.add('done')
    body.classList.remove('locked')
    body.classList.add('booted')
    window.removeEventListener('keydown', finish)
    boot.removeEventListener('pointerdown', finish)
    // keep the overlay in the tree briefly for its fade-out
    setTimeout(() => boot.remove(), 1200)
    onDone()
  }

  if (prefersReducedMotion()) {
    finish()
    return
  }

  window.addEventListener('keydown', finish)
  boot.addEventListener('pointerdown', finish)

  LINES.forEach((text, i) => {
    setTimeout(() => {
      if (finished) return
      const div = document.createElement('div')
      div.innerHTML = text.includes('<') ? text.replace(' <i>', ' … <i>') : text
      log.appendChild(div)
      bar.style.width = `${Math.round(((i + 1) / LINES.length) * 100)}%`
    }, 240 + i * LINE_MS)
  })

  setTimeout(finish, 240 + LINES.length * LINE_MS + 420)
}
