import { Canvas, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";

// Procedural, scroll-driven SandWeb demo. `progress.current` (0..1) is written
// by the page on scroll; everything here is derived from it each frame, so
// scrolling backwards simply rewinds the story.

export type ProgressRef = { current: number };
type SceneProps = { progress: ProgressRef; compact: boolean; active: boolean };

const STEPS = 6;
const RES_Y = -34;
const PERFS = [14, 22, 30, 38];
const C = { sand: new THREE.Color("#d9a35a"), sandLocked: new THREE.Color("#f2c53d"), sandweb: new THREE.Color("#ffd21f"), frac: new THREE.Color("#ff6a2b"), oil: new THREE.Color("#3df0c2"), gas: new THREE.Color("#9ff7ff"), steel: new THREE.Color("#7f929e"), danger: new THREE.Color("#ff3b30"), dark: new THREE.Color("#0b1015") };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number) => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const ramp = (s: number, from: number, to: number) => smooth((s - from) / (to - from));
const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

/** All story phases as a function of the scroll step (0..5). */
function phases(s: number) {
  const wear = ramp(s, 2.5, 3.0) * (1 - ramp(s, 3.8, 4.4));
  let production = THREE.MathUtils.lerp(0.45, 0.12, ramp(s, 2.5, 3.0));
  production = THREE.MathUtils.lerp(production, 1, ramp(s, 4.3, 4.8));
  return {
    open: ramp(s, 1.35, 2.1),
    loose: ramp(s, 2.45, 3.15),
    flowback: ramp(s, 2.4, 2.8) * (1 - ramp(s, 3.6, 4.1)),
    wear,
    treatFlow: ramp(s, 3.3, 3.65) * (1 - ramp(s, 4.4, 4.85)),
    treat: ramp(s, 3.4, 4.0),
    bond: ramp(s, 3.6, 4.25),
    production,
  };
}

// Camera keyframes per step: [position, target]. Desktop shifts the action
// right of the captions; mobile pulls back and lifts the subject above them.
const KEYS: [THREE.Vector3, THREE.Vector3][] = [
  [v(17, 9, 27), v(1, 6.5, 0)],
  [v(22, -6, 40), v(6, -21, 0)],
  [v(41, -27, 16), v(26, -34, -1)],
  [v(28, -13, 66), v(20, -19, 0)],
  [v(39, -26.5, 18), v(25, -34, 0)],
  [v(33, -16, 52), v(19, -22, 0)],
];

function makePath(parts: THREE.Curve<THREE.Vector3>[]) { const path = new THREE.CurvePath<THREE.Vector3>(); parts.forEach((part) => path.add(part)); return path; }
const L = (a: THREE.Vector3, b: THREE.Vector3) => new THREE.LineCurve3(a, b);
const Q = (a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3) => new THREE.QuadraticBezierCurve3(a, c, b);

function usePaths() {
  return useMemo(() => {
    const well = makePath([L(v(0, 0.6), v(0, -26)), Q(v(0, -26), v(0, RES_Y), v(8, RES_Y)), L(v(8, RES_Y), v(44, RES_Y))]);
    const flow = makePath([L(v(42, RES_Y), v(8, RES_Y)), Q(v(8, RES_Y), v(0, RES_Y), v(0, -26)), L(v(0, -26), v(0, 1.6)), L(v(0, 1.6), v(9.6, 1.6))]);
    const hose = Q(v(-6.2, 1.6, 4), v(-3, 0.2, 3.4), v(0, 2.3, 0.2));
    const treatment = makePath([hose, L(v(0, 2.3, 0.2), v(0, -26)), Q(v(0, -26), v(0, RES_Y), v(8, RES_Y)), L(v(8, RES_Y), v(42, RES_Y))]);
    return { well, hose, flowPts: flow.getSpacedPoints(900), treatPts: treatment.getSpacedPoints(900) };
  }, []);
}

function sampleAt(points: THREE.Vector3[], u: number, out: THREE.Vector3) {
  const f = clamp01(u) * (points.length - 1), i = Math.min(points.length - 2, Math.floor(f));
  return out.lerpVectors(points[i], points[i + 1], f - i);
}

function seeded(seed: number) { let x = seed; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }

// ── Surface ────────────────────────────────────────────────────────────────
function beamMatrix(a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const dir = b.clone().sub(a), length = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(radius, length, radius));
}

function Derrick() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const beams = useMemo(() => {
    const list: THREE.Matrix4[] = [], floor = 4, top = 19, base = 2.1, tip = 0.45, step = 2.5;
    const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    const width = (h: number) => THREE.MathUtils.lerp(base, tip, (h - floor) / (top - floor));
    const at = (corner: number[], h: number) => v(corner[0] * width(h), h, corner[1] * width(h));
    corners.forEach((corner) => list.push(beamMatrix(at(corner, floor), at(corner, top), 0.11)));
    for (let h = floor; h < top - 0.1; h += step) {
      const next = Math.min(top, h + step);
      corners.forEach((corner, i) => {
        const other = corners[(i + 1) % 4];
        list.push(beamMatrix(at(corner, next), at(other, next), 0.06));
        list.push(beamMatrix(at(corner, h), at(other, next), 0.045));
        list.push(beamMatrix(at(other, h), at(corner, next), 0.045));
      });
    }
    corners.forEach((corner) => list.push(beamMatrix(v(corner[0] * 2.6, 0, corner[1] * 2.6), v(corner[0] * 2.6, floor, corner[1] * 2.6), 0.16)));
    return list;
  }, []);
  useLayoutEffect(() => { beams.forEach((matrix, i) => ref.current?.setMatrixAt(i, matrix)); if (ref.current) ref.current.instanceMatrix.needsUpdate = true; }, [beams]);
  return <group>
    <instancedMesh ref={ref} args={[undefined, undefined, beams.length]}><cylinderGeometry args={[1, 1, 1, 6]} /><meshStandardMaterial color="#c9d4da" metalness={0.7} roughness={0.35} /></instancedMesh>
    <mesh position={[0, 4, 0]}><boxGeometry args={[6.2, 0.35, 6.2]} /><meshStandardMaterial color="#39444c" metalness={0.5} roughness={0.6} /></mesh>
    <mesh position={[0, 19.3, 0]}><boxGeometry args={[1.5, 0.7, 1.5]} /><meshStandardMaterial color="#ffd21f" emissive="#6b5300" /></mesh>
    <pointLight position={[0, 20.5, 0]} color="#ff4b3e" intensity={8} distance={8} />
  </group>;
}

function Wellhead({ equipment }: { equipment: THREE.MeshStandardMaterial }) {
  return <group>
    <mesh position={[0, 0.3, 0]} material={equipment}><cylinderGeometry args={[0.55, 0.6, 0.6, 20]} /></mesh>
    <mesh position={[0, 1.45, 0]} material={equipment}><cylinderGeometry args={[0.26, 0.26, 1.7, 16]} /></mesh>
    {[1, 1.95].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[0.7, 0.32, 0.7]} /><meshStandardMaterial color="#c63c2f" roughness={0.5} /></mesh>)}
    <mesh position={[0, 2.45, 0]}><cylinderGeometry args={[0.34, 0.34, 0.24, 16]} /><meshStandardMaterial color="#99a7b1" metalness={0.7} roughness={0.3} /></mesh>
  </group>;
}

function SurfaceEquipment({ equipment, sandPile }: { equipment: THREE.MeshStandardMaterial; sandPile: RefObject<THREE.Mesh | null> }) {
  const flowline = useMemo(() => beamMatrix(v(0, 1.6), v(9.6, 1.6), 0.14), []);
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scale = new THREE.Vector3();
  flowline.decompose(pos, quat, scale);
  return <group>
    <mesh position={pos} quaternion={quat} scale={scale}><cylinderGeometry args={[1, 1, 1, 10]} /><meshStandardMaterial color="#56656f" metalness={0.6} roughness={0.4} /></mesh>
    {/* Choke */}
    <group position={[4.6, 1.6, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={equipment}><cylinderGeometry args={[0.38, 0.38, 1.1, 16]} /></mesh>
      <mesh position={[0, 0.75, 0]} material={equipment}><cylinderGeometry args={[0.1, 0.1, 0.9, 8]} /></mesh>
      <mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.38, 0.06, 8, 24]} /><meshStandardMaterial color="#c63c2f" /></mesh>
    </group>
    {/* Pump / separator package */}
    <group position={[12, 0, 0]}>
      <mesh position={[0, 1.6, 0]} rotation={[0, 0, Math.PI / 2]} material={equipment}><cylinderGeometry args={[1.15, 1.15, 4.4, 24]} /></mesh>
      {[-1.6, 1.6].map((x) => <mesh key={x} position={[x, 0.3, 0]}><boxGeometry args={[0.35, 0.6, 1.8]} /><meshStandardMaterial color="#2f3a42" /></mesh>)}
      <mesh position={[3.3, 0.9, 0]} material={equipment}><boxGeometry args={[1.6, 1.8, 1.6]} /></mesh>
      <mesh ref={sandPile} position={[-0.6, 0.05, 1.7]}><coneGeometry args={[1.1, 0.9, 18]} /><meshStandardMaterial color="#c99a55" roughness={1} /></mesh>
    </group>
    {/* SandWeb tote */}
    <group position={[-7, 0, 4]}>
      <mesh position={[0, 0.15, 0]}><boxGeometry args={[2.1, 0.3, 2.1]} /><meshStandardMaterial color="#6a5236" /></mesh>
      <mesh position={[0, 1.2, 0]}><boxGeometry args={[1.8, 1.7, 1.8]} /><meshStandardMaterial color="#ffd21f" emissive="#8a6a00" emissiveIntensity={0.6} roughness={0.4} /></mesh>
      <lineSegments position={[0, 1.2, 0]}><wireframeGeometry args={[new THREE.BoxGeometry(1.95, 1.85, 1.95, 4, 4, 4)]} /><lineBasicMaterial color="#cfd8dd" /></lineSegments>
    </group>
  </group>;
}

// ── Subsurface ─────────────────────────────────────────────────────────────
const STRATA = [
  { top: 0, bottom: -7, color: "#3a2d22" },
  { top: -7, bottom: -14, color: "#4b3b2a" },
  { top: -14, bottom: -21, color: "#2d383d" },
  { top: -21, bottom: -29, color: "#3d3228" },
  { top: -29, bottom: -39, color: "#8a6233", reservoir: true },
  { top: -39, bottom: -48, color: "#25242a" },
];

function Strata() {
  const x0 = -16, x1 = 56, zBack = -12, zFront = 10;
  return <group>
    {STRATA.map((layer) => {
      const h = layer.top - layer.bottom, cy = (layer.top + layer.bottom) / 2, w = x1 - x0, cx = (x0 + x1) / 2;
      const box = new THREE.BoxGeometry(w, h, zFront - zBack);
      return <group key={layer.top}>
        <mesh position={[cx, cy, zBack]}><boxGeometry args={[w, h, 0.6]} /><meshStandardMaterial color={layer.color} roughness={0.95} /></mesh>
        <mesh position={[cx, cy, (zBack + zFront) / 2]}><boxGeometry args={[w, h, zFront - zBack]} /><meshStandardMaterial color={layer.color} transparent opacity={layer.reservoir ? 0.13 : 0.06} depthWrite={false} /></mesh>
        <lineSegments position={[cx, cy, (zBack + zFront) / 2]}><edgesGeometry args={[box]} /><lineBasicMaterial color={layer.reservoir ? "#ffb45a" : "#7d8b93"} transparent opacity={layer.reservoir ? 0.45 : 0.18} /></lineSegments>
      </group>;
    })}
    <gridHelper args={[72, 36, "#2c4752", "#17262d"]} position={[20, 0.02, -1]} />
  </group>;
}

function Wellbore({ path, core }: { path: THREE.CurvePath<THREE.Vector3>; core: THREE.MeshBasicMaterial }) {
  const casing = useMemo(() => new THREE.TubeGeometry(path, 260, 0.55, 18, false), [path]);
  const inner = useMemo(() => new THREE.TubeGeometry(path, 260, 0.22, 8, false), [path]);
  return <group>
    <mesh geometry={casing}><meshPhysicalMaterial color="#b8c7d0" metalness={0.6} roughness={0.25} transparent opacity={0.32} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={inner} material={core} />
    {PERFS.map((x) => <group key={x} position={[x, RES_Y, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.6, 0.08, 8, 28]} /><meshBasicMaterial color="#ff8a3d" /></mesh>
      {Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return <mesh key={i} position={[0, Math.sin(a) * 1.1, Math.cos(a) * 1.1]} rotation={[a, 0, 0]}><cylinderGeometry args={[0.07, 0.03, 1.1, 6]} /><meshBasicMaterial color="#ff9a4d" /></mesh>; })}
    </group>)}
  </group>;
}

function Fractures({ progress }: { progress: ProgressRef }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: C.frac, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  useFrame(() => {
    const p = phases(progress.current * (STEPS - 1));
    refs.current.forEach((mesh, i) => { if (!mesh) return; const grow = Math.max(0.001, smooth(p.open * 1.25 - i * 0.08)); mesh.scale.set(7.6 * grow, 5 * grow, 1); });
    material.color.copy(C.frac).lerp(C.sandweb, p.treat);
    material.setValues({ opacity: 0.1 + 0.16 * p.open + 0.14 * p.treat });
  });
  return <group>{PERFS.map((x, i) => <mesh key={x} ref={(mesh) => { refs.current[i] = mesh; }} material={material} position={[x, RES_Y, 0]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[1, 48]} /></mesh>)}</group>;
}

// ── Proppant grains + SandWeb bonds ────────────────────────────────────────
function useGrains(perFracture: number) {
  return useMemo(() => {
    const rand = seeded(42), count = perFracture * PERFS.length;
    const base = new Float32Array(count * 3), radius = new Float32Array(count), jitter = new Float32Array(count), loose = new Uint8Array(count), fracture = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const f = Math.floor(i / perFracture), r = Math.sqrt(rand()) * 0.97, a = rand() * Math.PI * 2;
      base[i * 3] = PERFS[f] + (rand() - 0.5) * 0.55;
      base[i * 3 + 1] = RES_Y + Math.sin(a) * r * 4.7;
      base[i * 3 + 2] = Math.cos(a) * r * 7.3;
      radius[i] = r; jitter[i] = rand(); fracture[i] = f; loose[i] = rand() < 0.34 ? 1 : 0;
    }
    // Bonds: each locked grain links to its two nearest locked neighbours.
    const bonds: { a: number; b: number; r: number }[] = [], seen = new Set<number>();
    for (let f = 0; f < PERFS.length; f++) {
      const ids = []; for (let i = f * perFracture; i < (f + 1) * perFracture; i++) if (!loose[i]) ids.push(i);
      for (const i of ids) {
        const near: [number, number][] = [];
        for (const j of ids) { if (j === i) continue; const dx = base[i * 3] - base[j * 3], dy = base[i * 3 + 1] - base[j * 3 + 1], dz = base[i * 3 + 2] - base[j * 3 + 2]; const d = dx * dx + dy * dy + dz * dz; if (d < 2.6) near.push([d, j]); }
        near.sort((x, y) => x[0] - y[0]).slice(0, 2).forEach(([, j]) => { const key = Math.min(i, j) * count + Math.max(i, j); if (seen.has(key)) return; seen.add(key); bonds.push({ a: i, b: j, r: Math.min(radius[i], radius[j]) }); });
      }
    }
    bonds.sort((x, y) => x.r - y.r);
    const bondPositions = new Float32Array(bonds.length * 6);
    bonds.forEach((bond, k) => { bondPositions.set(base.subarray(bond.a * 3, bond.a * 3 + 3), k * 6); bondPositions.set(base.subarray(bond.b * 3, bond.b * 3 + 3), k * 6 + 3); });
    return { count, base, radius, jitter, loose, fracture, bondPositions, bondCount: bonds.length };
  }, [perFracture]);
}

function Proppant({ progress, compact }: { progress: ProgressRef; compact: boolean }) {
  const grains = useGrains(compact ? 150 : 360);
  const mesh = useRef<THREE.InstancedMesh>(null), bonds = useRef<THREE.LineSegments>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), c: new THREE.Color() }), []);
  const lastBond = useRef(-1);
  useLayoutEffect(() => { const m = mesh.current; if (!m) return; for (let i = 0; i < grains.count; i++) m.setColorAt(i, C.sand); if (m.instanceColor) m.instanceColor.needsUpdate = true; }, [grains]);
  useFrame(({ clock }) => {
    const m = mesh.current; if (!m) return;
    const p = phases(progress.current * (STEPS - 1)), t = clock.elapsedTime, shake = p.loose * (1 - p.bond);
    const { base, radius, jitter, loose, fracture } = grains;
    for (let i = 0; i < grains.count; i++) {
      let scale = smooth((p.open * 1.45 - radius[i] - fracture[i] * 0.06) / 0.35) * (0.75 + jitter[i] * 0.5);
      tmp.p.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
      if (loose[i]) {
        const go = clamp01(p.loose * 1.35 - jitter[i] * 0.35);
        tmp.p.lerp(tmp.s.set(PERFS[fracture[i]], RES_Y, 0), smooth(go));
        scale *= 1 - smooth((go - 0.65) / 0.35);
      }
      if (shake > 0) tmp.p.add(tmp.s.set(Math.sin(t * 9 + i) * 0.06 * shake, Math.cos(t * 7 + i * 1.3) * 0.06 * shake, 0));
      tmp.m.compose(tmp.p, tmp.q, tmp.s.setScalar(Math.max(0.0001, scale)));
      m.setMatrixAt(i, tmp.m);
    }
    m.instanceMatrix.needsUpdate = true;
    if (Math.abs(p.bond - lastBond.current) > 0.01) {
      lastBond.current = p.bond;
      for (let i = 0; i < grains.count; i++) m.setColorAt(i, tmp.c.copy(C.sand).lerp(C.sandLocked, loose[i] ? 0 : p.bond * 0.85));
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    if (bonds.current) { bonds.current.geometry.setDrawRange(0, Math.floor(p.bond * grains.bondCount) * 2); (bonds.current.material as THREE.LineBasicMaterial).opacity = 0.35 + 0.6 * p.bond; }
  });
  return <group>
    <instancedMesh ref={mesh} args={[undefined, undefined, grains.count]} frustumCulled={false}><icosahedronGeometry args={[0.17, 0]} /><meshStandardMaterial color="#ffffff" roughness={0.75} flatShading /></instancedMesh>
    <lineSegments ref={bonds} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[grains.bondPositions, 3]} /></bufferGeometry><lineBasicMaterial color="#ffe14d" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} /></lineSegments>
  </group>;
}

// ── Moving fluids: flowback sand, SandWeb treatment, hydrocarbons ──────────
type StreamProps = { progress: ProgressRef; points: THREE.Vector3[]; count: number; size: number; color: THREE.Color | [THREE.Color, THREE.Color]; speed: number; spread: number; level: (p: ReturnType<typeof phases>) => number };

function Stream({ progress, points, count, size, color, speed, spread, level }: StreamProps) {
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const rand = seeded(count * 7 + Math.round(speed * 1000)), positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), offsets = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const c = Array.isArray(color) ? (rand() < 0.6 ? color[0] : color[1]) : color;
      colors.set([c.r, c.g, c.b], i * 3);
      offsets.set([rand(), (rand() - 0.5) * spread, (rand() - 0.5) * spread], i * 3);
    }
    return { positions, colors, offsets };
  }, [color, count, speed, spread]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const offset = useRef(0);
  useFrame((_, delta) => {
    const points3 = ref.current; if (!points3) return;
    const amount = level(phases(progress.current * (STEPS - 1)));
    const material = points3.material as THREE.PointsMaterial;
    material.opacity = amount; points3.visible = amount > 0.01;
    if (!points3.visible) return;
    offset.current = (offset.current + delta * speed * (0.35 + amount)) % 1;
    const { positions, offsets } = data;
    for (let i = 0; i < count; i++) {
      sampleAt(points, (offsets[i * 3] + offset.current) % 1, tmp);
      positions.set([tmp.x, tmp.y + offsets[i * 3 + 1], tmp.z + offsets[i * 3 + 2]], i * 3);
    }
    points3.geometry.attributes.position.needsUpdate = true;
  });
  return <points ref={ref} frustumCulled={false}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions, 3]} /><bufferAttribute attach="attributes-color" args={[data.colors, 3]} /></bufferGeometry>
    <pointsMaterial size={size} vertexColors transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
  </points>;
}

/** SandWeb spraying out of each perforation into the fracture wings. */
function Injection({ progress, compact }: { progress: ProgressRef; compact: boolean }) {
  const ref = useRef<THREE.Points>(null), count = compact ? 120 : 280;
  const data = useMemo(() => { const rand = seeded(7), dirs = new Float32Array(count * 4), positions = new Float32Array(count * 3); for (let i = 0; i < count; i++) { const a = rand() * Math.PI * 2; dirs.set([Math.floor(rand() * PERFS.length), Math.sin(a) * 4.6, Math.cos(a) * 7.1, rand()], i * 4); } return { dirs, positions }; }, [count]);
  useFrame(({ clock }) => {
    const pts = ref.current; if (!pts) return;
    const p = phases(progress.current * (STEPS - 1)), amount = ramp(p.treat, 0.1, 0.4) * (1 - ramp(p.bond, 0.7, 1));
    (pts.material as THREE.PointsMaterial).opacity = amount; pts.visible = amount > 0.01; if (!pts.visible) return;
    const { dirs, positions } = data;
    for (let i = 0; i < count; i++) { const life = (dirs[i * 4 + 3] + clock.elapsedTime * 0.35) % 1, reach = Math.sqrt(life); positions.set([PERFS[dirs[i * 4]], RES_Y + dirs[i * 4 + 1] * reach, dirs[i * 4 + 2] * reach], i * 3); }
    pts.geometry.attributes.position.needsUpdate = true;
  });
  return <points ref={ref} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.positions, 3]} /></bufferGeometry><pointsMaterial color="#ffd21f" size={0.32} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} /></points>;
}

function World({ progress, compact }: { progress: ProgressRef; compact: boolean }) {
  const paths = usePaths();
  const equipment = useMemo(() => new THREE.MeshStandardMaterial({ color: C.steel, metalness: 0.55, roughness: 0.4 }), []);
  const core = useMemo(() => new THREE.MeshBasicMaterial({ color: C.dark, transparent: true, opacity: 0.85 }), []);
  const hose = useMemo(() => new THREE.MeshBasicMaterial({ color: C.sandweb, transparent: true, opacity: 0 }), []);
  const hoseGeometry = useMemo(() => new THREE.TubeGeometry(paths.hose, 40, 0.12, 8, false), [paths]);
  const sandPile = useRef<THREE.Mesh>(null), fracLight = useRef<THREE.PointLight>(null), prodLight = useRef<THREE.PointLight>(null);
  const target = useRef(KEYS[0][1].clone()), desired = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3(), shift: new THREE.Vector3() }), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const colors = useMemo(() => ({ sand: [C.sand, C.sand] as [THREE.Color, THREE.Color], oil: [C.oil, C.gas] as [THREE.Color, THREE.Color], treat: [C.sandweb, new THREE.Color("#fff2a0")] as [THREE.Color, THREE.Color] }), []);

  useFrame(({ camera, clock, size }, delta) => {
    const s = progress.current * (STEPS - 1), p = phases(s), t = clock.elapsedTime;
    // Camera
    const i = Math.min(STEPS - 2, Math.floor(s)), k = smooth(s - i);
    desired.pos.lerpVectors(KEYS[i][0], KEYS[i + 1][0], k);
    desired.target.lerpVectors(KEYS[i][1], KEYS[i + 1][1], k);
    const portrait = size.width / size.height < 0.9;
    if (portrait) { desired.pos.sub(desired.target).multiplyScalar(1.55).add(desired.target); desired.shift.set(0, -9, 0); }
    else desired.shift.set(compact ? 0 : -6, 0, 0);
    desired.pos.add(desired.shift); desired.target.add(desired.shift);
    desired.pos.add(desired.shift.set(Math.sin(t * 0.25) * 0.6, Math.cos(t * 0.2) * 0.4, 0));
    const ease = 1 - Math.exp(-delta * 3.2);
    camera.position.lerp(desired.pos, ease); target.current.lerp(desired.target, ease); camera.lookAt(target.current);
    // Equipment wear / health
    equipment.color.copy(C.steel).lerp(C.danger, p.wear * 0.85);
    equipment.emissive.copy(C.danger).multiplyScalar(p.wear * (0.35 + 0.35 * Math.sin(t * 6))).add(tmpColor.copy(C.oil).multiplyScalar(0.12 * ramp(s, 4.4, 5)));
    sandPile.current?.scale.setScalar(Math.max(0.001, ramp(s, 2.6, 3.2)));
    // Fluid in the wellbore core
    core.color.copy(C.dark).lerp(C.sand, p.flowback * 0.8).lerp(C.sandweb, p.treatFlow).lerp(C.oil, ramp(s, 4.4, 5) * 0.55);
    hose.setValues({ opacity: p.treatFlow * 0.9 });
    if (fracLight.current) fracLight.current.intensity = 6 + 60 * p.treat * (1 - 0.4 * ramp(s, 4.5, 5));
    if (prodLight.current) prodLight.current.intensity = 30 * p.production;
  });

  return <group>
    <Strata />
    <Derrick />
    <Wellhead equipment={equipment} />
    <SurfaceEquipment equipment={equipment} sandPile={sandPile} />
    <mesh geometry={hoseGeometry} material={hose} />
    <Wellbore path={paths.well} core={core} />
    <Fractures progress={progress} />
    <Proppant progress={progress} compact={compact} />
    <Injection progress={progress} compact={compact} />
    <Stream progress={progress} points={paths.flowPts} count={compact ? 80 : 180} size={0.42} color={colors.sand} speed={0.07} spread={0.5} level={(p) => p.flowback} />
    <Stream progress={progress} points={paths.treatPts} count={compact ? 110 : 240} size={0.36} color={colors.treat} speed={0.09} spread={0.42} level={(p) => p.treatFlow} />
    <Stream progress={progress} points={paths.flowPts} count={compact ? 120 : 280} size={0.3} color={colors.oil} speed={0.06} spread={0.4} level={(p) => 0.25 + 0.75 * p.production} />
    <pointLight ref={fracLight} position={[26, RES_Y + 3, 6]} color="#ffd21f" distance={34} intensity={6} />
    <pointLight ref={prodLight} position={[6, -16, 6]} color="#3df0c2" distance={40} intensity={10} />
  </group>;
}

export default function SandWebScene({ progress, compact, active }: SceneProps) {
  return <Canvas
    frameloop={active ? "always" : "never"}
    dpr={[1, compact ? 1.25 : 1.6]}
    camera={{ position: KEYS[0][0].toArray(), fov: compact ? 55 : 46, near: 0.1, far: 400 }}
    gl={{ antialias: !compact, alpha: true, powerPreference: "high-performance" }}
  >
    <fog attach="fog" args={["#05080d", 45, 150]} />
    <hemisphereLight args={["#bfe6ff", "#3a2a1a", 0.9]} />
    <directionalLight position={[25, 40, 30]} intensity={2.2} color="#fff4dc" />
    <World progress={progress} compact={compact} />
  </Canvas>;
}
