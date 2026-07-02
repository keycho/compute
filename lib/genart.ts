/**
 * Seeded image synthesis for /generate.
 *
 * The same (prompt, style, aspect, variation) always paints the same
 * frame — deterministic output is the point on a verifiable network.
 * Everything is drawn locally on a canvas in the site's own palette,
 * so results feel native to q0r rather than pasted-in stock.
 */

import { hashSeed, mulberry32 } from "./prng";

export const STYLES = [
  { key: "aurora", label: "aurora" },
  { key: "structure", label: "structure" },
  { key: "organism", label: "organism" },
  { key: "noir", label: "noir" },
] as const;
export type StyleKey = (typeof STYLES)[number]["key"];

export const ASPECTS = [
  { key: "1:1", w: 704, h: 704 },
  { key: "4:3", w: 832, h: 624 },
  { key: "16:9", w: 896, h: 504 },
  { key: "9:16", w: 504, h: 896 },
] as const;
export type AspectKey = (typeof ASPECTS)[number]["key"];

// monochrome palettes: [bright, mid, light, ground] — brightness bands
// carry the composition, matching the black-and-white site identity
const PALETTES: Record<StyleKey, string[][]> = {
  aurora: [
    ["#f5f5f5", "#8f8f8f", "#c4c4c4", "#141414"],
    ["#e0e0e0", "#a8a8a8", "#6f6f6f", "#0f0f0f"],
    ["#ffffff", "#7a7a7a", "#b0b0b0", "#111111"],
  ],
  structure: [
    ["#e8e8e8", "#a0a0a0", "#2c2c2c", "#0a0a0a"],
    ["#cfcfcf", "#8a8a8a", "#232323", "#080808"],
  ],
  organism: [
    ["#f0f0f0", "#b5b5b5", "#7d7d7d", "#101010"],
    ["#d6d6d6", "#909090", "#696969", "#0c0c0c"],
  ],
  noir: [
    ["#ededed", "#7b7b7b", "#ffffff", "#0a0a0a"],
    ["#a7a7a7", "#ededed", "#8c8c8c", "#070707"],
  ],
};

export function seedFor(prompt: string, style: StyleKey, aspect: AspectKey, variation: number): number {
  return hashSeed(`${prompt.trim().toLowerCase()}|${style}|${aspect}|v${variation}`);
}

export function paint(
  canvas: HTMLCanvasElement,
  prompt: string,
  style: StyleKey,
  aspect: AspectKey,
  variation: number,
): void {
  const { w, h } = ASPECTS.find((a) => a.key === aspect)!;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const r = mulberry32(seedFor(prompt, style, aspect, variation));
  const palette = PALETTES[style][Math.floor(r() * PALETTES[style].length)];
  const [c1, c2, c3, bg] = palette;

  // ground
  const base = ctx.createLinearGradient(0, 0, w * (0.4 + r() * 0.6), h);
  base.addColorStop(0, bg);
  base.addColorStop(1, "#060606");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // luminous fields
  const blobs = 5 + Math.floor(r() * 5);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < blobs; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = (0.18 + r() * 0.4) * Math.max(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const col = [c1, c2, c3][Math.floor(r() * 3)];
    g.addColorStop(0, `${col}${Math.floor(74 + r() * 110).toString(16).padStart(2, "0")}`);
    g.addColorStop(1, `${col}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = "source-over";

  // style-specific geometry
  if (style === "structure") {
    ctx.globalAlpha = 0.5;
    const nodes: Array<[number, number]> = [];
    const count = 14 + Math.floor(r() * 14);
    for (let i = 0; i < count; i++) nodes.push([r() * w, r() * h]);
    ctx.strokeStyle = c2;
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const [x1, y1] = nodes[i];
      const [x2, y2] = nodes[(i + 1 + Math.floor(r() * 4)) % count];
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.fillStyle = c1;
    for (const [x, y] of nodes) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6 + r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (style === "organism") {
    ctx.globalAlpha = 0.55;
    const strands = 8 + Math.floor(r() * 10);
    for (let i = 0; i < strands; i++) {
      ctx.strokeStyle = [c1, c2, c3][Math.floor(r() * 3)];
      ctx.lineWidth = 0.8 + r() * 1.8;
      ctx.beginPath();
      let x = r() * w;
      let y = r() * h;
      ctx.moveTo(x, y);
      let ang = r() * Math.PI * 2;
      for (let s = 0; s < 60; s++) {
        ang += (r() - 0.5) * 0.9;
        x += Math.cos(ang) * (w / 90);
        y += Math.sin(ang) * (w / 90);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (style === "noir") {
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = c1;
    for (let i = 0; i < 26; i++) {
      const y = r() * h;
      ctx.lineWidth = 0.5 + r() * 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (r() - 0.5) * 80);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    // aurora: one thin arc of light
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = c3;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(
      w * (0.3 + r() * 0.4),
      h * (0.3 + r() * 0.4),
      w * (0.25 + r() * 0.3),
      h * (0.1 + r() * 0.15),
      r() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // vignette
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, "rgba(6,6,6,0)");
  v.addColorStop(1, "rgba(6,6,6,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);

  // pixelate: downsample to a coarse grid and upscale nearest-neighbor.
  // the block structure replaces grain as the texture — same abstract
  // pixel language as the site's WebGL layer. deterministic, so the
  // seed still reproduces the exact frame.
  const PX = 6;
  const pw = Math.max(1, Math.round(w / PX));
  const ph = Math.max(1, Math.round(h / PX));
  const small = document.createElement("canvas");
  small.width = pw;
  small.height = ph;
  const sctx = small.getContext("2d");
  if (sctx) {
    sctx.drawImage(canvas, 0, 0, pw, ph);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(small, 0, 0, pw, ph, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
  }
}

const GEN_NODES = ["nd-da01", "nd-77aa", "nd-4c1a", "nd-b068", "nd-d592", "nd-e504"];

export function genMeta(prompt: string, style: StyleKey, aspect: AspectKey, variation: number) {
  const r = mulberry32(seedFor(prompt, style, aspect, variation) ^ 0x9e37);
  const node = GEN_NODES[Math.floor(r() * GEN_NODES.length)];
  const seed = Math.floor(r() * 0xffffff);
  return {
    node,
    seed,
    hash: `0x${seed.toString(16).padStart(6, "0")}`,
    ms: 2_400 + Math.floor(r() * 3_800),
    costUsdc: 0.01 + r() * 0.05,
  };
}
