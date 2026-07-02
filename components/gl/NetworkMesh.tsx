"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createNetwork, stepNetwork, type NetworkState } from "@/lib/network";
import { mulberry32 } from "@/lib/prng";
import { viewState } from "@/lib/viewState";

/**
 * The provider mesh: luminous nodes joined by faint edges, with job
 * packets pulsing along them. Node brightness carries state — tier sets
 * the base, arriving jobs flash it brighter (earnings as light).
 */

const packetVertex = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * (170.0 / -mv.z);
  }
`;

const packetFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.06, d) * uOpacity;
    gl_FragColor = vec4(vColor * 1.7, a);
  }
`;

// monochrome: job kinds separate by brightness, not hue
const KIND_COLORS: Record<string, [number, number, number]> = {
  inference: [1.0, 1.0, 1.0],
  training: [0.55, 0.55, 0.55],
  settlement: [0.8, 0.8, 0.8],
};

const MAX_PACKETS = 96;

export default function NetworkMesh({
  progressRef,
  network,
  scale = 8,
  position = [0, 0.2, -4] as [number, number, number],
  rotationSpeed = 0.03,
  onPick,
  selected = -1,
}: {
  /** opacity 0..1 — mesh presence; form 0..1 — scale-in on arrival */
  progressRef: React.MutableRefObject<{ opacity: number; form: number }>;
  network?: NetworkState;
  scale?: number;
  position?: [number, number, number];
  rotationSpeed?: number;
  onPick?: (index: number) => void;
  selected?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);
  const rand = useMemo(() => mulberry32(0xa11ce), []);

  const state = useMemo(() => network ?? createNetwork(56), [network]);

  const { nodeGeometry, nodeMaterial, edgeGeometry, edgeMaterial, packetGeometry, packetMaterial, dummy, baseColors } =
    useMemo(() => {
      const nodeGeometry = new THREE.IcosahedronGeometry(0.016, 1);
      const nodeMaterial = new THREE.MeshBasicMaterial({ transparent: true });

      const edgePositions = new Float32Array(state.edges.length * 6);
      state.edges.forEach((e, i) => {
        const a = state.nodes[e.a];
        const b = state.nodes[e.b];
        edgePositions.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
      });
      const edgeGeometry = new THREE.BufferGeometry();
      edgeGeometry.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(0.26, 0.26, 0.26),
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const packetGeometry = new THREE.BufferGeometry();
      packetGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_PACKETS * 3), 3));
      packetGeometry.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(MAX_PACKETS * 3), 3));
      packetGeometry.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(MAX_PACKETS), 1));
      const packetMaterial = new THREE.ShaderMaterial({
        vertexShader: packetVertex,
        fragmentShader: packetFragment,
        uniforms: { uOpacity: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const dummy = new THREE.Object3D();
      const baseColors = state.nodes.map((n) => {
        const t = n.tier;
        return new THREE.Color(
          0.2 + t * 0.16,
          0.2 + t * 0.16,
          0.2 + t * 0.16,
        );
      });
      return { nodeGeometry, nodeMaterial, edgeGeometry, edgeMaterial, packetGeometry, packetMaterial, dummy, baseColors };
    }, [state]);

  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, dt) => {
    const { opacity, form } = progressRef.current;
    if (!group.current) return;
    group.current.visible = opacity > 0.004;
    if (!group.current.visible) return;

    const scale01 = viewState.reducedMotion ? 0.22 : 1;
    stepNetwork(state, Math.min(dt, 0.05) * scale01, rand);

    timeRef.current += dt * (viewState.reducedMotion ? 0.12 : 1);
    const t = timeRef.current;
    group.current.rotation.y = t * rotationSpeed;
    const s = scale * (0.82 + 0.18 * form);
    group.current.scale.setScalar(s);

    // nodes: position bob + brightness = base * tier + glow
    const mesh = nodesRef.current;
    if (mesh) {
      for (let i = 0; i < state.nodes.length; i++) {
        const n = state.nodes[i];
        const bob = Math.sin(t * 0.6 + i * 1.7) * 0.008;
        dummy.position.set(n.x, n.y + bob, n.z);
        const sz = (n.tier === 2 ? 2.0 : n.tier === 1 ? 1.4 : 1) * (1 + n.glow * 0.5);
        dummy.scale.setScalar(sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        tmpColor.copy(baseColors[i]);
        const brightness = (1 + n.glow * 2.6) * opacity;
        tmpColor.multiplyScalar(brightness);
        if (n.glow > 0.4) tmpColor.lerp(new THREE.Color(1.9, 1.9, 1.9), Math.min(n.glow - 0.4, 1) * 0.6);
        if (i === selected) tmpColor.set(2.6, 2.6, 2.6);
        mesh.setColorAt(i, tmpColor);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // packets
    const pos = packetGeometry.getAttribute("position") as THREE.BufferAttribute;
    const col = packetGeometry.getAttribute("aColor") as THREE.BufferAttribute;
    const siz = packetGeometry.getAttribute("aSize") as THREE.BufferAttribute;
    const count = Math.min(state.jobs.length, MAX_PACKETS);
    for (let i = 0; i < count; i++) {
      const j = state.jobs[i];
      const e = state.edges[j.edge];
      const a = state.nodes[e.a];
      const b = state.nodes[e.b];
      const tt = Math.max(0, Math.min(1, j.t));
      pos.setXYZ(i, a.x + (b.x - a.x) * tt, a.y + (b.y - a.y) * tt, a.z + (b.z - a.z) * tt);
      const c = KIND_COLORS[j.kind];
      col.setXYZ(i, c[0], c[1], c[2]);
      siz.setX(i, j.size);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    siz.needsUpdate = true;
    packetGeometry.setDrawRange(0, count);
    packetMaterial.uniforms.uOpacity.value = opacity;

    nodeMaterial.opacity = opacity;
    edgeMaterial.opacity = 0.5 * opacity;
  });

  return (
    <group ref={group} position={position}>
      <instancedMesh
        ref={nodesRef}
        args={[nodeGeometry, nodeMaterial, state.nodes.length]}
        frustumCulled={false}
        onClick={
          onPick
            ? (e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined) onPick(e.instanceId);
              }
            : undefined
        }
        onPointerOver={onPick ? () => (document.body.style.cursor = "pointer") : undefined}
        onPointerOut={onPick ? () => (document.body.style.cursor = "") : undefined}
      />
      <lineSegments geometry={edgeGeometry} material={edgeMaterial} frustumCulled={false} />
      <points geometry={packetGeometry} material={packetMaterial} frustumCulled={false} />
    </group>
  );
}
