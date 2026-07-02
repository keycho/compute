"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/lib/prng";
import { viewState } from "@/lib/viewState";

const COUNT = 1500;

const vertex = /* glsl */ `
  attribute vec3 aSeed;
  attribute float aSize;
  uniform float uTime;
  uniform float uHalo;
  uniform float uStream;
  uniform float uDim;
  varying float vTint;
  varying float vFade;

  const float TAU = 6.28318530718;

  void main() {
    vTint = aSeed.z;

    // ambient dust: a broad slow-drifting volume
    vec3 dust = (aSeed - 0.5) * vec3(26.0, 15.0, 12.0);
    dust.x += sin(uTime * 0.05 + aSeed.y * TAU) * 0.9;
    dust.y += sin(uTime * 0.04 + aSeed.x * TAU) * 0.7;
    dust.z -= 6.0;

    // halo: orbiting shell around the core
    float r = 1.9 + aSeed.y * 2.4;
    float ang = aSeed.x * TAU + uTime * (0.04 + aSeed.z * 0.05);
    vec3 halo = vec3(
      cos(ang) * r + 2.4,
      (aSeed.z - 0.5) * 2.1 + sin(uTime * 0.3 + aSeed.x * TAU) * 0.18,
      sin(ang) * r * 0.5 - 4.2
    );

    // streams: vertical data lanes
    float lane = floor(aSeed.x * 16.0) / 16.0;
    float flow = mod(aSeed.y * 18.0 - uTime * (0.9 + aSeed.z * 1.6), 18.0) - 9.0;
    vec3 stream = vec3(
      lane * 22.0 - 11.0 + sin(aSeed.z * TAU) * 0.35,
      -flow,
      -5.5 + aSeed.z * 2.0
    );

    vec3 pos = mix(dust, halo, uHalo);
    pos = mix(pos, stream, uStream);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float twinkle = 0.75 + 0.25 * sin(uTime * (1.0 + aSeed.x * 2.0) + aSeed.y * TAU);
    // small, clamped points: discrete grains instead of overlapping blobs
    gl_PointSize = clamp(aSize * twinkle * (90.0 / -mv.z), 1.0, 12.0);
    vFade = uDim * twinkle * smoothstep(-24.0, -3.0, mv.z);
  }
`;

const fragment = /* glsl */ `
  varying float vTint;
  varying float vFade;

  void main() {
    // hard-edged square grains — crisp pixel dust, no soft halo.
    // the blur was the falloff; the grain is the point itself.
    vec3 mid = vec3(0.5);
    vec3 bright = vec3(0.92);
    vec3 dark = vec3(0.28);
    vec3 col = vTint < 0.72 ? mid : (vTint < 0.9 ? bright : dark);
    gl_FragColor = vec4(col, vFade * 0.3);
  }
`;

export interface ParticleUniforms {
  [uniform: string]: { value: number };
  uTime: { value: number };
  uHalo: { value: number };
  uStream: { value: number };
  uDim: { value: number };
}

export default function Particles({
  uniformsRef,
}: {
  uniformsRef: React.MutableRefObject<ParticleUniforms | null>;
}) {
  const material = useRef<THREE.ShaderMaterial>(null);

  const { positions, seeds, sizes, uniforms } = useMemo(() => {
    const rand = mulberry32(0xc0ffee);
    const positions = new Float32Array(COUNT * 3); // unused by shader, required attr
    const seeds = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      seeds[i * 3] = rand();
      seeds[i * 3 + 1] = rand();
      seeds[i * 3 + 2] = rand();
      sizes[i] = 0.4 + rand() * 1.6;
    }
    const uniforms: ParticleUniforms = {
      uTime: { value: 0 },
      uHalo: { value: 1 },
      uStream: { value: 0 },
      uDim: { value: 1 },
    };
    return { positions, seeds, sizes, uniforms };
  }, []);

  uniformsRef.current = uniforms;

  useFrame((_, dt) => {
    // near-still (not frozen) for prefers-reduced-motion
    uniforms.uTime.value += dt * (viewState.reducedMotion ? 0.12 : 1);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
