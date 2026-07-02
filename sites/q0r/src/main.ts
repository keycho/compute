// entry point: boots the sequence, builds the webgl world, and binds the
// scroll/pointer/ui systems to it.

import '@fontsource-variable/space-grotesk'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/main.css'

import * as THREE from 'three'
import { QorWorld, type CameraStop } from './gl/scene'
import { runBoot } from './ui/boot'
import { startCounters } from './ui/counters'
import { ScrollManager, type SectionAnchor } from './ui/scroll'
import { ConsoleSim } from './ui/console'
import { prefersReducedMotion } from './util'

interface CameraKey {
  pos: THREE.Vector3
  look: THREE.Vector3
  bright: number
  bloom: number
}

function cameraKeys(world: QorWorld): Record<string, CameraKey> {
  // frame the system section on the highlighted route
  const rc = world.route.center
  const sysPos = rc.clone().multiplyScalar(1.4).add(new THREE.Vector3(0, 10, 26))
  return {
    hero: {
      pos: new THREE.Vector3(0, 6, 132),
      look: new THREE.Vector3(0, 2, 0),
      bright: 1.0,
      bloom: 1.05,
    },
    network: {
      pos: new THREE.Vector3(34, 12, 46),
      look: new THREE.Vector3(-14, 0, -12),
      bright: 1.3,
      bloom: 1.18,
    },
    system: { pos: sysPos, look: rc.clone(), bright: 0.75, bloom: 0.9 },
    console: {
      pos: new THREE.Vector3(8, 46, 108),
      look: new THREE.Vector3(0, 2, 0),
      bright: 0.5,
      bloom: 0.62,
    },
    protocol: {
      pos: new THREE.Vector3(-6, -14, 152),
      look: new THREE.Vector3(0, 6, 0),
      bright: 0.65,
      bloom: 0.8,
    },
    end: {
      pos: new THREE.Vector3(0, -32, 178),
      look: new THREE.Vector3(0, 16, 0),
      bright: 0.95,
      bloom: 1.0,
    },
  }
}

function init(): void {
  const canvas = document.getElementById('gl') as HTMLCanvasElement

  let world: QorWorld | null = null
  try {
    world = new QorWorld(canvas)
  } catch (err) {
    document.body.classList.add('no-gl')
    console.warn('webgl unavailable, running in static mode', err)
  }

  if (world && prefersReducedMotion()) world.timeScale = 0

  const keys = world ? cameraKeys(world) : null

  const applyAnchors = (anchors: SectionAnchor[]): void => {
    if (!world || !keys) return
    const stops: CameraStop[] = []
    for (const a of anchors) {
      const key = keys[a.id]
      if (key) stops.push({ p: a.p, ...key })
    }
    world.setStops(stops)
  }

  new ScrollManager((s) => {
    world?.setProgress(s.progress)
    world?.setRoutePhase(s.sysLocal)
  }, applyAnchors)

  // pointer parallax (mouse only)
  if (world && !prefersReducedMotion()) {
    window.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return
        world.setPointer(
          (e.clientX / window.innerWidth) * 2 - 1,
          (e.clientY / window.innerHeight) * 2 - 1,
        )
      },
      { passive: true },
    )
  }

  startCounters()
  new ConsoleSim()

  runBoot(() => {
    // nothing extra: the css `booted` state reveals chrome + hero
  })

  world?.start()
}

init()
