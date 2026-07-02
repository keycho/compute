"use client";

import { forwardRef, useMemo } from "react";
import { Effect } from "postprocessing";
import { Uniform } from "three";

/**
 * Ordered (Bayer 4x4) dithering, monochrome.
 *
 * Quantizes luminance to a handful of levels and pushes every gradient
 * through a fixed threshold pattern — fog, fresnel falloff, and glow
 * all become patterned pixels instead of smooth ramps. Combined with
 * the low-dpr nearest-neighbor upscale this is what makes the scene
 * read as sharp pixel structure: nothing on the canvas CAN be soft.
 */

const fragment = /* glsl */ `
  uniform float levels;

  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x / 2.0 + a.y * a.y * 0.75);
  }
  float bayer4(vec2 a) {
    return bayer2(0.5 * a) * 0.25 + bayer2(a);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float lum = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
    float t = bayer4(gl_FragCoord.xy) - 0.5;
    float q = clamp(floor(lum * levels + 0.5 + t) / levels, 0.0, 1.0);
    // hue-preserving: quantize brightness, keep chroma — grayscale
    // scenes are unaffected, accent colors survive the dither
    vec3 col = lum > 0.0001 ? inputColor.rgb * (q / lum) : vec3(q);
    outputColor = vec4(clamp(col, 0.0, 1.0), inputColor.a);
  }
`;

class DitherEffect extends Effect {
  constructor(levels: number) {
    super("DitherEffect", fragment, {
      uniforms: new Map<string, Uniform>([["levels", new Uniform(levels)]]),
    });
  }
}

const Dither = forwardRef<DitherEffect, { levels?: number }>(function Dither(
  { levels = 5 },
  ref,
) {
  const effect = useMemo(() => new DitherEffect(levels), [levels]);
  return <primitive ref={ref} object={effect} dispose={null} />;
});

export default Dither;
