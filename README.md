# q0r — the execution layer for distributed compute

Marketing/experience site for the q0r network: a cinematic, WebGL-driven
single page that presents the protocol as a living system rather than a
product page. One persistent Three.js scene runs behind the entire document;
scrolling drives a damped camera path through a luminous compute mesh while
glass UI sections emerge above it.

## Experience map

| Section    | What happens |
| ---------- | ------------ |
| boot       | protocol handshake log, skippable, then the world reveals |
| hero       | the `q0r` wordmark over the distant mesh + live network metrics |
| network    | the camera flies inside the mesh; topology copy + node HUD chips |
| system     | sticky 4-step execution path (submit → route → execute → verify), scrubbed by scroll: a real route lights up in the scene - path draw, travelling packet, echo verification pulses, finality ring |
| console    | the operator view: a live 2d simulation of one provider node - inbound job packets, settle flares, utilization ring, epoch accrual, verified-execution stream |
| protocol   | five-verb API surface, CLI session, execution receipt, protocol primitives |
| end        | the mesh recedes to a horizon behind an outlined wordmark |

## Stack

- vite + typescript (strict), no framework - DOM sections + one WebGL canvas
- three.js: custom shader points/lines (additive), sprite nebulae, dust shell
- postprocessing: UnrealBloom → OutputPass → custom grade (vignette, subtle
  chromatic aberration, shadow lift)
- fonts self-hosted via fontsource (Space Grotesk, IBM Plex Mono)

## Performance & behavior notes

- pixel ratio clamped (1.75 desktop / 1.25 mobile), reduced particle counts
  on mobile, no per-frame allocations in the render loop
- rendering pauses when the tab is hidden; the console sim runs only while
  on screen (IntersectionObserver)
- `prefers-reduced-motion`: boot skips, ambient motion freezes, camera still
  follows scroll deterministically
- graceful degradation: if WebGL is unavailable the site falls back to a
  static gradient background with all content intact
- deterministic world: mesh, route, and console topology are seeded, so the
  scene is identical on every load

## Develop

```
npm install
npm run dev       # vite dev server
npm run build     # tsc --noEmit + vite build -> dist/
npm run preview   # serve the production build
```

Deploys as a fully static site (no server, no env vars).
