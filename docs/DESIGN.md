# Compute Markets — design system

The financial layer for compute. A protocol interface, not a marketing site:
every surface reads like an instrument that is already running.

Reference DNA (studied, not copied): Lambda's mono-forward typographic
discipline, hairline grid, numbered sections, restrained single-accent
palette, state-swap hovers, terminal motifs. Fused with an immersive
Active-Theory-style WebGL journey: pure black, volumetric fog, crystalline
geometry, particle flows, neural mesh, soft bloom, floating glass panels.
Where Lambda is flat and warm (cream/ultraviolet, hard RGB-split shadows,
zero radius, zero glass), Compute Markets is deep and cool (ice/signal
blue/violet, soft phosphor glow, glass panels with real blur). Same
discipline, different physics.

## 1. Color

Cool, near-black, two accents used with extreme restraint.

- `--bg`               #050507   page void (WebGL clear color)
- `--bg-raised`        #0A0A0E   panels, cards
- `--line`             rgba(235,240,255,0.08)   hairline grid
- `--line-strong`      rgba(235,240,255,0.16)
- `--ink`              #EDF0F7   primary text (cool white)
- `--ink-dim`          #A7ADBD   secondary text
- `--ink-mute`         #62687A   labels, numbers-at-rest
- `--signal`           #5B7CFF   signal blue: links, live data, slashes
- `--signal-bright`    #8FA8FF
- `--violet`           #8B5CF6   secondary accent: training/derived data
- `--cyan`             #67E8F9   sparingly: positive flow, glow cores
- `--pos`              #34D399   up-ticks
- `--neg`              #FB7185   down-ticks
- glass: rgba(10,12,18,0.55) + backdrop-blur(20px) + 1px --line border

Accent discipline: blue is *live data and interaction*, violet is *derived
or structural*, green/red only ever numbers. Never large fills.

## 2. Typography

Mono-forward like a terminal, but cool and geometric.

- Display: **Space Grotesk** 500/600, tracking -0.03em, lh 0.98–1.05.
- Mono: **IBM Plex Mono** 400/500 — body default, all labels, all numerals
  (tabular), nav, buttons, table rows.
- Long-form copy: mono at 15–16px/1.7 in `--ink-dim`. No third face needed.

Scale (desktop → clamps down): display-xl clamp(3rem, 7.2vw, 6.75rem);
h2 clamp(2.2rem, 4.6vw, 4rem); h3 clamp(1.4rem, 2.2vw, 1.75rem);
body 16; small 14; label 12 caps +0.14em; tick 11.

Motifs: `[ LABEL ]` square-bracket chips (mono 12 caps, --ink-mute, brackets
in --signal). Index numbers `01 /` — digits --ink-mute, slash --signal.
Column headings prefixed `::`. Symbols like `H100-PERP` always mono 500.

## 3. Space & structure

- Container 1360px, 24px inline padding. Full-bleed hairlines separate
  sections; content hairlines collapse (-1px) into shared grids.
- Section rhythm: pad-block clamp(110px, 14vh, 170px); hero 100svh.
- Sharp corners on structural chrome (buttons, chips: 2px). Glass panels
  14px radius. Nothing else rounded.
- Corner brackets: 12px L-strokes on glass panel corners (targeting
  reticle), 1px --line-strong.

## 4. Motion

House curve `cubic-bezier(0.7, 0, 0.3, 1)`; fast 120ms / smooth 450ms /
long 800ms. Rules:

- Hover = state swap + glow bloom (border-color → accent, soft outer
  0→24px rgba(91,124,255,0.25)), never scale, never lift.
- Reveals: opacity 0→1, y 28→0, blur 8→0, 800ms, 60ms stagger (GSAP,
  scrub-less triggers at 78% viewport).
- Numbers decode: character scramble 480ms, 30ms tick, resolving
  left→right (labels and symbols only, on reveal and hover).
- Live cells pulse once per tick: background flash rgba(±)0.12 → 0, 600ms.
- WebGL is the connective tissue: one fixed canvas, camera choreographed
  by scroll progress; sections hand off scenes (crystal → shatters into
  mesh → camera enters mesh → resolves into data streams → dims). Mouse
  parallax ±0.4 units with 0.06 lerp. Reduced motion: static frames,
  no smooth scroll, no scramble.

## 5. WebGL scenes (single canvas, `components/gl/`)

- 0.00–0.16  CORE: crystalline shard cluster (instanced octahedra, fresnel
  emissive, slow orbit), particle halo, fog #050507.
- 0.16–0.34  SHATTER: shards interpolate outward into 56 mesh nodes.
- 0.34–0.62  MESH: neural graph fully formed; packets pulse along edges;
  camera pushes through the lattice.
- 0.62–0.84  STREAMS: mesh recedes; particles align into vertical data
  streams behind the developer terminal.
- 0.84–1.00  VOID: everything dims to 20%, footer floats on black.

Bloom (postprocessing) intensity 0.9, luminance threshold 0.2. DPR capped
1.75. All geometry instanced; zero per-frame allocations.

## 6. Voice

Production system documentation. Declarative present tense. No vision, no
"we're building", no hype. Sentences state what the protocol does:
"Funding accrues hourly against the utilization oracle." Numbers are
specific. UI microcopy lowercase-tolerant but default sentence case;
labels ALL-CAPS mono.

## 7. Page map

1. Nav — fixed 64px, hairline bottom, glass after 24px scroll. Links:
   Markets, Perpetuals, Indexes, Analytics, Developers, Docs. Boxed
   `Launch App` CTA (full-height right block, signal fill on hover).
2. Hero — 100svh. Left: `[ THE FINANCIAL LAYER FOR COMPUTE ]` eyebrow,
   display-xl headline, mono subcopy, Launch App + View Markets. Right:
   floating glass terminal — live market list (six symbols, sparklines,
   funding), depth strip, pointer-tilt parallax.
3. Ticker — full-bleed marquee, all symbols, hairline top+bottom.
4. Numbered strip — three `01 /` declarative system facts.
5. Markets — section header + 4 glass feature cards (Perpetual Markets,
   Tokenized Compute, Liquidity, Indexes), checker offset layout.
6. Analytics — stat rail (TVL, Volume, Funding, OI, Utilization) + most
   active markets + top gainers + funding heatmap + live depth chart.
7. Protocol — numbered accordion rows: order flow → clearing →
   settlement → oracle. System mechanics copy.
8. Developers — terminal panel (REST / WebSocket / SDK / Subgraph tabs,
   print-in animation) + capability list.
9. CTA band — inverted glow panel: "Connect to the exchange."
10. Footer — 4 columns + giant dimmed wordmark + legal. Signature:
    compression particle line.

`/app` — the network console: full-viewport WebGL mesh (providers as
luminous nodes, jobs as moving energy packets, earnings as accumulating
light), floating glass HUD panels (network stats, node inspector, live job
stream, epoch settlement). No tables, no forms. Spatial UI.
