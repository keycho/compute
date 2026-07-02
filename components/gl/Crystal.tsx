"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/lib/prng";
import { viewState } from "@/lib/viewState";

/**
 * The core: a cluster of crystalline shards orbiting a bright heart.
 * Idles with slow rotation and breathing; `shatter` (0..1) throws the
 * shards outward toward the network shell as the hero hands off to the
 * mesh; `opacity` fades the whole structure.
 */

const SHARDS = 26;

const vertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.4);
    float facet = 0.5 + 0.5 * dot(normalize(vNormal), normalize(vec3(0.4, 0.8, 0.5)));
    vec3 base = vec3(0.028, 0.032, 0.055) + facet * vec3(0.02, 0.024, 0.05);
    vec3 col = base + uColor * (fres * 1.7 + 0.05);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

interface Shard {
  pos: THREE.Vector3;
  out: THREE.Vector3;
  scale: number;
  spin: THREE.Vector3;
  phase: number;
  violet: boolean;
}

export default function Crystal({
  progressRef,
}: {
  /** x: shatter 0..1, y: opacity 0..1 */
  progressRef: React.MutableRefObject<{ shatter: number; opacity: number }>;
}) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<Array<THREE.Mesh | null>>([]);
  const timeRef = useRef(0);

  const { geometry, coreGeometry, blueMat, violetMat, coreMat, shards } = useMemo(() => {
    const geometry = new THREE.OctahedronGeometry(1, 0).toNonIndexed();
    geometry.computeVertexNormals();
    const coreGeometry = new THREE.OctahedronGeometry(0.36, 1).toNonIndexed();
    coreGeometry.computeVertexNormals();

    const mk = (color: THREE.Color) =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uColor: { value: color }, uOpacity: { value: 1 } },
        transparent: true,
        depthWrite: true,
      });
    const blueMat = mk(new THREE.Color(0.28, 0.42, 1.0));
    const violetMat = mk(new THREE.Color(0.5, 0.32, 0.95));
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.2, 2.6, 4.2), // HDR-bright: bloom halo
      transparent: true,
    });

    const rand = mulberry32(0x5eed);
    const shards: Shard[] = [];
    for (let i = 0; i < SHARDS; i++) {
      const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      const dist = 0.55 + Math.pow(rand(), 1.4) * 1.35;
      shards.push({
        pos: dir.clone().multiplyScalar(dist),
        out: dir.clone().multiplyScalar(6 + rand() * 7),
        scale: 0.08 + Math.pow(rand(), 2.2) * 0.5,
        spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.5),
        phase: rand() * Math.PI * 2,
        violet: rand() > 0.66,
      });
    }
    return { geometry, coreGeometry, blueMat, violetMat, coreMat, shards };
  }, []);

  useFrame((_, dt) => {
    const { shatter, opacity } = progressRef.current;
    timeRef.current += dt * (viewState.reducedMotion ? 0.12 : 1);
    const t = timeRef.current;
    if (!group.current) return;
    group.current.visible = opacity > 0.004;
    if (!group.current.visible) return;

    group.current.rotation.y = t * 0.11;
    group.current.rotation.x = Math.sin(t * 0.07) * 0.12;

    const ease = shatter * shatter * (3 - 2 * shatter);
    for (let i = 0; i < SHARDS; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const s = shards[i];
      const bob = Math.sin(t * 0.7 + s.phase) * 0.07;
      m.position.set(
        s.pos.x + (s.out.x - s.pos.x) * ease,
        s.pos.y + (s.out.y - s.pos.y) * ease + bob,
        s.pos.z + (s.out.z - s.pos.z) * ease,
      );
      const sdt = dt * (viewState.reducedMotion ? 0.12 : 1);
      m.rotation.x += s.spin.x * sdt;
      m.rotation.y += s.spin.y * sdt;
      const breathe = 1 + Math.sin(t * 0.8 + s.phase) * 0.04;
      m.scale.setScalar(s.scale * breathe * (1 - ease * 0.55));
    }

    blueMat.uniforms.uOpacity.value = opacity;
    violetMat.uniforms.uOpacity.value = opacity;
    coreMat.opacity = opacity * (0.75 + Math.sin(t * 1.7) * 0.15) * (1 - ease);
  });

  return (
    <group ref={group} position={[2.1, 0.2, -3.2]}>
      <mesh geometry={coreGeometry} material={coreMat} />
      {Array.from({ length: SHARDS }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          geometry={geometry}
          material={shards[i].violet ? violetMat : blueMat}
        />
      ))}
    </group>
  );
}
