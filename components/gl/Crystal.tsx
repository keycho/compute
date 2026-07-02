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
  const ringGroup = useRef<THREE.Group>(null);
  const ringShards = useRef<Array<THREE.Mesh | null>>([]);
  const timeRef = useRef(0);

  const { geometry, coreGeometry, blueMat, violetMat, coreMat, shards, ringGeometry, ringMaterial } = useMemo(() => {
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

    // thin orbit line: a ring of points joined as a loop
    const RING_SEGS = 96;
    const ringPts = new Float32Array(RING_SEGS * 3);
    for (let i = 0; i < RING_SEGS; i++) {
      const a = (i / RING_SEGS) * Math.PI * 2;
      ringPts[i * 3] = Math.cos(a) * 2.45;
      ringPts[i * 3 + 1] = 0;
      ringPts[i * 3 + 2] = Math.sin(a) * 2.45;
    }
    const ringGeometry = new THREE.BufferGeometry();
    ringGeometry.setAttribute("position", new THREE.BufferAttribute(ringPts, 3));
    const ringMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(0.32, 0.42, 0.85),
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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
    return { geometry, coreGeometry, blueMat, violetMat, coreMat, shards, ringGeometry, ringMaterial };
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

    // orbit ring: counter-rotates, dissolves first when the core shatters
    if (ringGroup.current) {
      ringGroup.current.rotation.y = -t * 0.2;
      ringGroup.current.rotation.z = 0.42 + Math.sin(t * 0.13) * 0.05;
      ringGroup.current.scale.setScalar(1 + ease * 1.6);
    }
    ringMaterial.opacity = 0.28 * opacity * (1 - ease);
    for (let i = 0; i < ringShards.current.length; i++) {
      const m = ringShards.current[i];
      if (!m) continue;
      const a = (i / 10) * Math.PI * 2 + t * 0.2;
      m.position.set(Math.cos(a) * 2.45, 0, Math.sin(a) * 2.45);
      m.rotation.y = a + t * 0.6;
      m.scale.setScalar(0.055 * (1 + Math.sin(t * 1.2 + i) * 0.18) * (1 - ease));
    }
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
      <group ref={ringGroup}>
        <lineLoop geometry={ringGeometry} material={ringMaterial} />
        {Array.from({ length: 10 }, (_, i) => (
          <mesh
            key={`ring-${i}`}
            ref={(el) => {
              ringShards.current[i] = el;
            }}
            geometry={geometry}
            material={i % 3 === 0 ? violetMat : blueMat}
          />
        ))}
      </group>
    </group>
  );
}
