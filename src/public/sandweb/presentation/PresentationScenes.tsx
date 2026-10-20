import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Three procedural "macro" scenes for the narrated SandWeb presentation.
// `clock.current` is the narration time in seconds for the active scene, so
// pausing the audio freezes the animation and captions stay in sync.

export type ClockRef = { current: number };
type SceneId = "problem" | "sandweb" | "result";
type Props = { scene: SceneId; clock: ClockRef; compact: boolean; active: boolean };

const SAND = new THREE.Color("#c9965a"), GOLD = new THREE.Color("#ffcf2e"), WEB = new THREE.Color("#ffd21f");
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
function seeded(seed: number) { let x = seed; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }

function GrainMaterial() { return <meshStandardMaterial color="#ffffff" roughness={0.7} metalness={0.05} flatShading />; }

// ── Scene 1: loose sand dragged by flow, eroding steel ──────────────────────
function ProblemScene({ clock, compact }: { clock: ClockRef; compact: boolean }) {
  const count = compact ? 150 : 320, sparks = compact ? 90 : 200;
  const grains = useRef<THREE.InstancedMesh>(null), sparkPts = useRef<THREE.Points>(null), wear = useRef<THREE.MeshBasicMaterial>(null), wearMesh = useRef<THREE.Mesh>(null);
  const data = useMemo(() => {
    const r = seeded(11), g = Array.from({ length: count }, () => ({ phase: r(), y: (r() - 0.5) * 7, z: (r() - 0.5) * 7, speed: 0.05 + r() * 0.05, size: 0.1 + r() * 0.2, spin: r() * 3, wob: r() * 6.28 }));
    const s = Array.from({ length: sparks }, () => ({ seed: r(), rate: 1.2 + r() * 1.2 }));
    const rocks = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return { pos: [(r() - 0.5) * 34 - 4, Math.sin(a) * (8 + r() * 3), -6 - r() * 8] as [number, number, number], scale: 2.5 + r() * 3.5 }; });
    return { g, s, rocks, sparkPos: new Float32Array(sparks * 3) };
  }, [count, sparks]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3() }), []);
  useLayoutEffect(() => { const m = grains.current; if (!m) return; const c = new THREE.Color(); data.g.forEach((_, i) => m.setColorAt(i, c.copy(SAND).offsetHSL(0, 0, (i % 7) * 0.02 - 0.06))); if (m.instanceColor) m.instanceColor.needsUpdate = true; }, [data]);
  useFrame(({ camera }) => {
    const t = clock.current, m = grains.current; if (!m) return;
    data.g.forEach((g, i) => {
      const u = (g.phase + t * g.speed * (1 + ramp(t, 4, 9))) % 1, x = -16 + u * 25.5;
      const pull = smooth((x + 4) / 14);
      tmp.p.set(x, g.y * (1 - pull * 0.55) + Math.sin(t * 1.6 + g.wob) * 0.5, g.z * (1 - pull * 0.55) + Math.cos(t * 1.3 + g.wob) * 0.5);
      tmp.q.setFromEuler(tmp.e.set(t * g.spin, t * g.spin * 0.7, g.wob));
      tmp.m.compose(tmp.p, tmp.q, tmp.s.setScalar(g.size * (u > 0.97 ? (1 - u) / 0.03 : 1)));
      m.setMatrixAt(i, tmp.m);
    });
    m.instanceMatrix.needsUpdate = true;
    const intensity = ramp(t, 5, 10);
    const sp = sparkPts.current;
    if (sp) {
      data.s.forEach((s, i) => {
        const k = t * s.rate + s.seed, life = k % 1, n = Math.floor(k), rr = seeded(1 + n * 977 + i * 31);
        const y0 = (rr() - 0.5) * 3.2, z0 = (rr() - 0.5) * 3.2, vy = (rr() - 0.3) * 5, vz = (rr() - 0.5) * 6, vx = -2 - rr() * 5;
        data.sparkPos.set([9.4 + vx * life * 0.6, y0 + vy * life - 4 * life * life, z0 + vz * life * 0.6], i * 3);
      });
      sp.geometry.attributes.position.needsUpdate = true;
      (sp.material as THREE.PointsMaterial).opacity = intensity;
    }
    wear.current?.setValues({ opacity: 0.08 + 0.4 * intensity * (0.75 + 0.25 * Math.sin(t * 9)) });
    wearMesh.current?.scale.setScalar(1.2 + 2.2 * ramp(t, 4, 16));
    camera.position.set(-5 + 8 * smooth(t / 20), 1.6 + Math.sin(t * 0.4) * 0.5, 13 - 4 * smooth(t / 20));
    camera.lookAt(4.5 + 2 * smooth(t / 20), 0, 0);
  });
  return <group>
    <fog attach="fog" args={["#07090d", 12, 40]} />
    <ambientLight intensity={0.35} />
    <directionalLight position={[-8, 10, 8]} intensity={1.8} color="#ffe2b8" />
    <pointLight position={[8.5, 0, 3]} color="#ff4a2a" intensity={40} distance={14} />
    <pointLight position={[-10, -3, 5]} color="#3df0c2" intensity={14} distance={20} />
    {data.rocks.map((rock, i) => <mesh key={i} position={rock.pos} scale={rock.scale}><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#2a2018" roughness={1} flatShading /></mesh>)}
    <instancedMesh ref={grains} args={[undefined, undefined, count]} frustumCulled={false}><icosahedronGeometry args={[1, 1]} /><GrainMaterial /></instancedMesh>
    <mesh position={[10.6, 0, 0]}><boxGeometry args={[1.2, 16, 16]} /><meshStandardMaterial color="#7d8a93" metalness={0.9} roughness={0.32} /></mesh>
    <mesh ref={wearMesh} position={[9.98, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><circleGeometry args={[1, 40]} /><meshBasicMaterial ref={wear} color="#ff3b1f" transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
    <points ref={sparkPts} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.sparkPos, 3]} /></bufferGeometry><pointsMaterial color="#ffb34a" size={0.14} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></points>
  </group>;
}

// ── Shared sand pack (scene 2 + 3) ──────────────────────────────────────────
function usePack(compact: boolean) {
  return useMemo(() => {
    const r = seeded(5), target = compact ? 150 : 260, pts: THREE.Vector3[] = [];
    for (let tries = 0; pts.length < target && tries < 20000; tries++) {
      const p = new THREE.Vector3((r() - 0.5) * 12, (r() - 0.5) * 8, (r() - 0.5) * 8);
      if ((p.x / 6) ** 2 + (p.y / 4) ** 2 + (p.z / 4) ** 2 > 1) continue;
      if (pts.every((q) => q.distanceToSquared(p) > 0.62)) pts.push(p);
    }
    const sizes = pts.map(() => 0.3 + r() * 0.16), bonds: [number, number][] = [], seen = new Set<number>();
    pts.forEach((p, i) => {
      pts.map((q, j) => [p.distanceToSquared(q), j] as const).filter(([d, j]) => j !== i && d < 2.1).sort((a, b) => a[0] - b[0]).slice(0, 3).forEach(([, j]) => { const key = Math.min(i, j) * 10000 + Math.max(i, j); if (!seen.has(key)) { seen.add(key); bonds.push([i, j]); } });
    });
    bonds.sort((a, b) => Math.min(pts[a[0]].x, pts[a[1]].x) - Math.min(pts[b[0]].x, pts[b[1]].x));
    const bondPos = new Float32Array(bonds.length * 6);
    bonds.forEach(([a, b], k) => { bondPos.set(pts[a].toArray(), k * 6); bondPos.set(pts[b].toArray(), k * 6 + 3); });
    const nodePos = new Float32Array(pts.length * 3); pts.forEach((p, i) => nodePos.set(p.toArray(), i * 3));
    return { pts, sizes, bondPos, bondCount: bonds.length, nodePos, phases: pts.map(() => r() * 6.28) };
  }, [compact]);
}

function Pack({ clock, compact, web, loose }: { clock: ClockRef; compact: boolean; web: (t: number) => number; loose: (t: number) => number }) {
  const pack = usePack(compact);
  const grains = useRef<THREE.InstancedMesh>(null), lines = useRef<THREE.LineSegments>(null), nodes = useRef<THREE.Points>(null), lastWeb = useRef(-1);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color() }), []);
  useFrame(() => {
    const t = clock.current, w = web(t), l = loose(t), m = grains.current; if (!m) return;
    pack.pts.forEach((p, i) => {
      const ph = pack.phases[i];
      tmp.p.copy(p).add(tmp.s.set(Math.sin(t * 1.3 + ph) * 0.35 * l, Math.cos(t * 1.1 + ph) * 0.35 * l, Math.sin(t * 0.9 + ph * 2) * 0.35 * l));
      tmp.q.setFromAxisAngle(tmp.s.set(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), ph).normalize(), ph + t * 0.6 * l);
      tmp.m.compose(tmp.p, tmp.q, tmp.s.setScalar(pack.sizes[i]));
      m.setMatrixAt(i, tmp.m);
    });
    m.instanceMatrix.needsUpdate = true;
    if (Math.abs(w - lastWeb.current) > 0.01) {
      lastWeb.current = w;
      pack.pts.forEach((p, i) => { const reached = clamp01(w * 1.25 - (p.x + 6) / 12 * 0.9); m.setColorAt(i, tmp.c.copy(SAND).lerp(GOLD, reached * 0.8)); });
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    lines.current?.geometry.setDrawRange(0, Math.floor(w * pack.bondCount) * 2);
    (nodes.current?.material as THREE.PointsMaterial | undefined)?.setValues({ opacity: w * 0.9 });
  });
  return <group>
    <instancedMesh ref={grains} args={[undefined, undefined, pack.pts.length]} frustumCulled={false}><icosahedronGeometry args={[1, 1]} /><GrainMaterial /></instancedMesh>
    <lineSegments ref={lines} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[pack.bondPos, 3]} /></bufferGeometry><lineBasicMaterial color={WEB} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></lineSegments>
    <points ref={nodes} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[pack.nodePos, 3]} /></bufferGeometry><pointsMaterial color="#fff1a0" size={0.22} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></points>
  </group>;
}

// ── Scene 2: SandWeb threads the web ────────────────────────────────────────
function SandWebScene({ clock, compact }: { clock: ClockRef; compact: boolean }) {
  const count = compact ? 160 : 360, fluid = useRef<THREE.Points>(null), glow = useRef<THREE.PointLight>(null);
  const data = useMemo(() => { const r = seeded(21); return { seeds: Array.from({ length: count }, () => [r(), r() * 6.28, (r() - 0.5) * 6, 0.12 + r() * 0.1]), pos: new Float32Array(count * 3) }; }, [count]);
  useFrame(({ camera }) => {
    const t = clock.current, f = fluid.current;
    if (f) {
      const flow = ramp(t, 0.5, 2.5) * (1 - ramp(t, 19, 23));
      data.seeds.forEach(([seed, ang, y, speed], i) => { const life = (seed + t * speed) % 1, rad = 16 * (1 - life) + 1.5, a = ang + life * 5; data.pos.set([Math.cos(a) * rad * 1.3, y * (1 - life * 0.6), Math.sin(a) * rad], i * 3); });
      f.geometry.attributes.position.needsUpdate = true;
      (f.material as THREE.PointsMaterial).setValues({ opacity: flow });
    }
    if (glow.current) glow.current.intensity = 10 + 50 * ramp(t, 2, 14);
    const a = 0.4 + t * 0.16, rad = 17 - 4 * smooth(t / 24);
    camera.position.set(Math.cos(a) * rad, 3 + Math.sin(t * 0.3) * 2.5, Math.sin(a) * rad);
    camera.lookAt(0, 0, 0);
  });
  return <group>
    <fog attach="fog" args={["#06070a", 14, 42]} />
    <ambientLight intensity={0.3} />
    <directionalLight position={[6, 10, 6]} intensity={1.4} color="#fff0d0" />
    <pointLight ref={glow} position={[0, 0, 0]} color="#ffd21f" intensity={10} distance={18} />
    <pointLight position={[-12, 6, -8]} color="#3d7cf0" intensity={20} distance={30} />
    <Pack clock={clock} compact={compact} web={(t) => ramp(t, 3.5, 19)} loose={(t) => 1 - ramp(t, 4, 16)} />
    <points ref={fluid} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.pos, 3]} /></bufferGeometry><pointsMaterial color="#ffd21f" size={0.16} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></points>
  </group>;
}

// ── Scene 3: oil flows through, pull back to the whole well ─────────────────
function ResultScene({ clock, compact }: { clock: ClockRef; compact: boolean }) {
  const count = compact ? 220 : 500, oil = useRef<THREE.Points>(null), well = useRef<THREE.Points>(null);
  const wellPath = useMemo(() => { const p = new THREE.CurvePath<THREE.Vector3>(); p.add(new THREE.LineCurve3(new THREE.Vector3(80, 0, 0), new THREE.Vector3(-60, 0, 0))); p.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-60, 0, 0), new THREE.Vector3(-85, 0, 0), new THREE.Vector3(-85, 25, 0))); p.add(new THREE.LineCurve3(new THREE.Vector3(-85, 25, 0), new THREE.Vector3(-85, 110, 0))); return p; }, []);
  const tube = useMemo(() => new THREE.TubeGeometry(wellPath, 200, 0.9, 12, false), [wellPath]);
  const wellPts = useMemo(() => wellPath.getSpacedPoints(600), [wellPath]);
  const data = useMemo(() => {
    const r = seeded(31), wc = compact ? 200 : 420, oilC = new THREE.Color("#3df0c2"), gasC = new THREE.Color("#ffb547");
    const seeds = Array.from({ length: count }, () => [r(), (r() - 0.5) * 7, (r() - 0.5) * 7, 0.08 + r() * 0.08, r()]);
    const col = new Float32Array(count * 3); seeds.forEach((s, i) => col.set((s[4] < 0.6 ? oilC : gasC).toArray(), i * 3));
    return { seeds, pos: new Float32Array(count * 3), col, wseeds: Array.from({ length: wc }, () => [r(), (r() - 0.5) * 1.2, (r() - 0.5) * 1.2]), wpos: new Float32Array(wc * 3) };
  }, [count, compact]);
  useFrame(({ camera }) => {
    const t = clock.current;
    data.seeds.forEach(([seed, y, z, speed], i) => { const u = (seed + t * speed) % 1, x = -9 + u * 18; data.pos.set([x, y + Math.sin(x * 0.8 + seed * 9) * 0.5, z + Math.cos(x * 0.7 + seed * 7) * 0.5], i * 3); });
    if (oil.current) oil.current.geometry.attributes.position.needsUpdate = true;
    const v = new THREE.Vector3();
    data.wseeds.forEach(([seed, dy, dz], i) => { const u = (seed + t * 0.05) % 1, n = wellPts.length - 1, f = u * n, k = Math.min(n - 1, Math.floor(f)); v.lerpVectors(wellPts[k], wellPts[k + 1], f - k); data.wpos.set([v.x, v.y + dy, v.z + dz], i * 3); });
    if (well.current) { well.current.geometry.attributes.position.needsUpdate = true; (well.current.material as THREE.PointsMaterial).setValues({ opacity: ramp(t, 6, 10) }); }
    const pull = smooth((t - 5.5) / 13), dist = 13 + pull * 175;
    const dir = new THREE.Vector3(0.45 - pull * 0.6, 0.3 + pull * 0.25, 1).normalize();
    const target = new THREE.Vector3(-30 * pull, 30 * pull, 0);
    const a = t * 0.08;
    camera.position.copy(target).add(dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), a * (1 - pull)).multiplyScalar(dist));
    camera.lookAt(target);
  });
  return <group>
    <fog attach="fog" args={["#05070b", 30, 400]} />
    <ambientLight intensity={0.35} />
    <directionalLight position={[10, 20, 10]} intensity={1.5} color="#fff0d0" />
    <pointLight position={[0, 0, 4]} color="#3df0c2" intensity={30} distance={20} />
    <Pack clock={clock} compact={compact} web={() => 1} loose={() => 0} />
    <points ref={oil} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.pos, 3]} /><bufferAttribute attach="attributes-color" args={[data.col, 3]} /></bufferGeometry><pointsMaterial size={0.17} vertexColors transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></points>
    {[-50, -25, 0, 25, 50].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[16, 11, 1]}><circleGeometry args={[1, 48]} /><meshBasicMaterial color="#ffc21f" transparent opacity={0.16} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>)}
    {[-50, -25, 25, 50].map((x) => <mesh key={x} position={[x, 0, 0]} scale={[0.6, 5, 7]}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color="#b88a3a" emissive="#5a3d00" roughness={1} transparent opacity={0.65} /></mesh>)}
    <mesh geometry={tube}><meshStandardMaterial color="#9fb0ba" metalness={0.8} roughness={0.3} transparent opacity={0.55} /></mesh>
    <points ref={well} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.wpos, 3]} /></bufferGeometry><pointsMaterial color="#3df0c2" size={0.7} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></points>
    <gridHelper args={[260, 52, "#2b4a55", "#14232a"]} position={[-20, 110, 0]} />
    <mesh position={[-85, 112, 0]}><cylinderGeometry args={[2, 2.6, 4, 16]} /><meshStandardMaterial color="#ffd21f" emissive="#7a5d00" /></mesh>
  </group>;
}

export default function PresentationScenes({ scene, clock, compact, active }: Props) {
  return <Canvas frameloop={active ? "always" : "never"} dpr={[1, compact ? 1.25 : 1.75]} camera={{ fov: compact ? 58 : 45, near: 0.1, far: 900, position: [0, 0, 15] }} gl={{ antialias: false, powerPreference: "high-performance" }}>
    <color attach="background" args={["#05070b"]} />
    {scene === "problem" ? <ProblemScene clock={clock} compact={compact} /> : scene === "sandweb" ? <SandWebScene clock={clock} compact={compact} /> : <ResultScene clock={clock} compact={compact} />}
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={compact ? 0.8 : 1.15} luminanceThreshold={0.55} luminanceSmoothing={0.25} />
      <Vignette offset={0.25} darkness={0.75} />
    </EffectComposer>
  </Canvas>;
}
