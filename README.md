# Compute Markets

The financial layer for compute. An on-chain exchange where GPU capacity
clears as a financial asset: perpetual futures, tokenized compute credits,
and AI infrastructure indexes, settled against live utilization data from
the network oracle.

## Surfaces

- `/` — the exchange. A scroll-choreographed WebGL journey through the
  protocol: crystalline core → provider mesh → data streams, with a live
  market terminal, institutional analytics, protocol mechanics, and the
  developer surface floating above it as glass panels.
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
components/sections/ nav, hero, terminal, ticker, features, analytics,
                     protocol, developers, cta, footer
components/console/  the /app network console + HUD
components/ui/       primitives: Reveal, Scramble, Sparkline, DepthChart,
                     CountUp, SectionHeader, Button, Logo
lib/                 seeded simulations (market engine, provider mesh),
                     shared view state, formatting
docs/DESIGN.md       the design system: tokens, motion rules, scene map
```

Every moving number on the site is driven by one seeded market engine and
one seeded network simulation, so all surfaces observe the same tape and
server/client first paints agree.

## Development

```
npm install
npm run dev        # localhost:3000
npm run build      # production build (also typechecks)
npm run typecheck
```

Deploys as a fully static Next.js build; no environment variables
required.
