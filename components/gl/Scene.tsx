"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { viewState } from "@/lib/viewState";
import Crystal from "./Crystal";
import Particles, { type ParticleUniforms } from "./Particles";
import NetworkMesh from "./NetworkMesh";

/**
 * The single connective canvas behind the whole journey.
 *
 * Scroll progress hands scenes to each other:
 *   0.00–0.14  core crystal idles (hero)
 *   0.10–0.26  shatter — shards fly outward, mesh forms out of them
 *   0.26–0.60  camera pushes into the living mesh (protocol/network state)
 *   0.60–0.82  particles align into vertical data streams (developers)
 *   0.82–1.00  everything dims toward the void (cta/footer)
 */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function Rig({
  particleUniforms,
  crystalProgress,
  meshProgress,
}: {
  particleUniforms: React.MutableRefObject<ParticleUniforms | null>;
  crystalProgress: React.MutableRefObject<{ shatter: number; opacity: number }>;
  meshProgress: React.MutableRefObject<{ opacity: number; form: number }>;
}) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 0, -3));

  useFrame(() => {
    const p = viewState.scroll;
    const reduced = viewState.reducedMotion;

    const shatter = smooth(0.1, 0.26, p);
    const dim = 1 - smooth(0.76, 0.93, p) * 0.88;

    crystalProgress.current.shatter = shatter;
    crystalProgress.current.opacity = (1 - smooth(0.16, 0.28, p)) * dim;

    meshProgress.current.form = smooth(0.14, 0.34, p);
    meshProgress.current.opacity =
      smooth(0.14, 0.3, p) * (1 - smooth(0.62, 0.8, p) * 0.85) * dim * 0.85;

    const u = particleUniforms.current;
    if (u) {
      u.uHalo.value = 1 - smooth(0.12, 0.3, p);
      u.uStream.value = smooth(0.58, 0.74, p) * (1 - smooth(0.8, 0.92, p));
      u.uDim.value = dim;
    }

    // camera: dolly in through the mesh, drift down toward the streams
    const push = smooth(0.28, 0.6, p);
    const sink = smooth(0.6, 0.84, p);
    const targetZ = 10 - push * 3.4 + sink * 1.2;
    const targetY = -sink * 0.9;

    const px = reduced ? 0 : viewState.pointerX * 0.55;
    const py = reduced ? 0 : viewState.pointerY * 0.35;

    camera.position.x += (px - camera.position.x) * 0.045;
    camera.position.y += (targetY + py - camera.position.y) * 0.045;
    camera.position.z += (targetZ - camera.position.z) * 0.06;

    look.current.set(
      (1 - shatter) * 1.1,
      targetY * 0.6,
      -3,
    );
    camera.lookAt(look.current);
  });

  return null;
}

export default function Scene() {
  const particleUniforms = useRef<ParticleUniforms | null>(null);
  const crystalProgress = useRef({ shatter: 0, opacity: 1 });
  const meshProgress = useRef({ opacity: 0, form: 0 });

  return (
    <div className="pixelated fixed inset-0 -z-10" aria-hidden>
      <Canvas
        camera={{ fov: 42, near: 0.1, far: 60, position: [0, 0, 10] }}
        // rendered small and upscaled nearest-neighbor (.pixelated): the
        // scene reads as abstract pixel structure behind the crisp DOM text
        dpr={0.3}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor("#060606");
          scene.fog = new THREE.Fog("#060606", 7, 22);
        }}
      >
        <Suspense fallback={null}>
          <Rig
            particleUniforms={particleUniforms}
            crystalProgress={crystalProgress}
            meshProgress={meshProgress}
          />
          {/* shifted right + up so the formation clears the hero copy
              and action cards on the left */}
          <group position={[1.9, 0.45, 0]}>
            <Crystal progressRef={crystalProgress} />
            <NetworkMesh progressRef={meshProgress} />
            <Particles uniformsRef={particleUniforms} />
          </group>
          <EffectComposer>
            {/* tight bloom: only the HDR core blooms — the haze was
                washing the pixel grains into smoke */}
            <Bloom
              mipmapBlur
              intensity={0.3}
              luminanceThreshold={0.5}
              luminanceSmoothing={0.25}
              radius={0.45}
            />
            <Vignette darkness={0.72} offset={0.28} />
            <Noise opacity={0.06} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
