"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { viewState } from "@/lib/viewState";
import Dither from "./Dither";
import Particles, { type ParticleUniforms } from "./Particles";
import NetworkMesh from "./NetworkMesh";

/**
 * The single connective canvas behind the whole journey.
 *
 * The formation IS the product: a constellation of worker nodes joined
 * by routes, with job packets moving between them — no abstract rock,
 * no dust cloud. It assembles once on arrival and slowly rotates.
 *
 * Scroll progress:
 *   0.00–0.60  constellation idles right of the copy; camera pushes in
 *   0.60–0.82  particles align into vertical data streams (developers)
 *   0.82–1.00  everything dims toward the void (cta/footer)
 */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function Rig({
  particleUniforms,
  meshProgress,
}: {
  particleUniforms: React.MutableRefObject<ParticleUniforms | null>;
  meshProgress: React.MutableRefObject<{ opacity: number; form: number }>;
}) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(1.1, 0, -3));

  useFrame((state) => {
    const p = viewState.scroll;
    const reduced = viewState.reducedMotion;
    const t = state.clock.elapsedTime;

    const dim = 1 - smooth(0.76, 0.93, p) * 0.88;

    // assemble once on arrival, then hold; fade for the streams finale
    meshProgress.current.form = reduced ? 1 : smooth(0.15, 1.7, t);
    meshProgress.current.opacity = (1 - smooth(0.62, 0.8, p) * 0.85) * dim;

    const u = particleUniforms.current;
    if (u) {
      u.uHalo.value = 0; // ambient dust only — no orbiting shell
      u.uStream.value = smooth(0.58, 0.74, p) * (1 - smooth(0.8, 0.92, p));
      u.uDim.value = dim;
    }

    // camera: dolly in through the constellation, drift down to streams
    const push = smooth(0.28, 0.6, p);
    const sink = smooth(0.6, 0.84, p);
    const targetZ = 10 - push * 3.4 + sink * 1.2;
    const targetY = -sink * 0.9;

    const px = reduced ? 0 : viewState.pointerX * 0.55;
    const py = reduced ? 0 : viewState.pointerY * 0.35;

    camera.position.x += (px - camera.position.x) * 0.045;
    camera.position.y += (targetY + py - camera.position.y) * 0.045;
    camera.position.z += (targetZ - camera.position.z) * 0.06;

    look.current.set(1.1, targetY * 0.6, -3);
    camera.lookAt(look.current);
  });

  return null;
}

export default function Scene() {
  const particleUniforms = useRef<ParticleUniforms | null>(null);
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
          <Rig particleUniforms={particleUniforms} meshProgress={meshProgress} />
          {/* shifted right + up so the constellation clears the hero
              copy and action cards on the left */}
          <group position={[2.2, 0.5, 0]}>
            <NetworkMesh progressRef={meshProgress} scale={6.5} rotationSpeed={0.02} />
            <Particles uniformsRef={particleUniforms} />
          </group>
          <EffectComposer>
            {/* no bloom — bloom is a blur pass by definition. vignette
                shapes the light, then the dither quantizes every
                gradient into patterned pixels: nothing can render soft */}
            <Vignette darkness={0.72} offset={0.28} />
            <Dither levels={5} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
