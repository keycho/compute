# q0r

The execution layer for decentralized compute. Applications submit
workloads; the protocol discovers providers, routes execution, verifies
every result, and settles rewards automatically.

## Surfaces

- `/` — the protocol. A scroll-choreographed WebGL journey: crystalline
  core → provider mesh → data streams, with live network telemetry,
  network state, the execution pipeline, and the developer surface
  floating above it as glass panels.
- `/app` — the network console. The operational view of the mesh:
  providers as luminous nodes, jobs as energy packets in flight, earnings
  accumulating as light. Click a node to inspect it.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4
- Three.js + React Three Fiber + postprocessing (bloom, vignette, grain)
- framer-motion (DOM choreography) + GSAP + Lenis (smooth scroll)
- Custom GLSL for particles, crystal fresnel, and packet sprites

## Architecture

```
app/                 routes (/, /app)
components/gl/       the WebGL layer: Scene (camera rig + choreography),
                     Crystal, Particles, NetworkMesh (shared with /app)
components/sections/ nav, hero, telemetry, ticker, protocol pillars,
                     network state, execution pipeline, developers, cta,
                     footer
components/console/  the /app network console + HUD
components/ui/       primitives: Reveal, Scramble, Sparkline, DepthChart,
                     CountUp, SectionHeader, Button, Logo
lib/                 the deterministic protocol simulation (provider
                     mesh + derived metrics), shared view state, formatting
docs/DESIGN.md       the design system: tokens, motion rules, scene map
```

Every moving number on the site derives from one deterministic protocol
simulation: providers → capacity → throughput → queue depth → latency →
rewards. All surfaces observe the same network state and server/client
first paints agree.

## Development

```
npm install
npm run dev        # localhost:3000
npm run build      # production build (also typechecks)
npm run typecheck
```

Deploys as a fully static Next.js build; no environment variables
required.
