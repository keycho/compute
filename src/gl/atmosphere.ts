// volumetric feel on a budget: large additive gradient billboards act as
// nebula light volumes, a wide dust shell gives the camera parallax depth.

import * as THREE from 'three'
import { DUST, MOBILE, PALETTE } from '../config'
import { mulberry32 } from '../util'

function makeGlowTexture(): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

interface Nebula {
  sprite: THREE.Sprite
  baseScale: number
  baseOpacity: number
  seed: number
}

export class Atmosphere {
  readonly group = new THREE.Group()
  private readonly nebulae: Nebula[] = []

  constructor(mobile: boolean) {
    const rand = mulberry32(777)
    const glow = makeGlowTexture()

    const tints = [PALETTE.blue, PALETTE.violet, PALETTE.blue, PALETTE.violet, PALETTE.cyan]
    const count = mobile ? 5 : 7
    for (let n = 0; n < count; n++) {
      const mat = new THREE.SpriteMaterial({
        map: glow,
        color: tints[n % tints.length],
        transparent: true,
        opacity: 0.05 + rand() * 0.05,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const sprite = new THREE.Sprite(mat)
      const theta = rand() * Math.PI * 2
      const r = 70 + rand() * 90
      sprite.position.set(
        Math.cos(theta) * r,
        (rand() - 0.5) * 80,
        Math.sin(theta) * r - 50, // biased behind the mesh
      )
      const scale = 130 + rand() * 120
      sprite.scale.setScalar(scale)
      this.group.add(sprite)
      this.nebulae.push({ sprite, baseScale: scale, baseOpacity: mat.opacity, seed: rand() * 10 })
    }

    // dust shell
    const dustCount = mobile ? MOBILE.dustCount : DUST.count
    const positions = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i++) {
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      const r = 90 + Math.pow(rand(), 0.6) * (DUST.radius - 90)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.7
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      map: glow,
      color: PALETTE.white,
      size: 1.1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.group.add(new THREE.Points(geo, mat))
  }

  update(time: number): void {
    for (const n of this.nebulae) {
      const breathe = 1 + 0.06 * Math.sin(time * 0.11 + n.seed * 7)
      n.sprite.scale.setScalar(n.baseScale * breathe)
      ;(n.sprite.material as THREE.SpriteMaterial).opacity =
        n.baseOpacity * (0.85 + 0.15 * Math.sin(time * 0.17 + n.seed * 3))
    }
    this.group.rotation.y = time * 0.004
  }
}
