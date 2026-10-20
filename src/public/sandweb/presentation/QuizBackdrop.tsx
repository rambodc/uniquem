import { Canvas, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildPack, dotTexture, makeGrainGeometry, seeded } from "./world3d";

export type QuizScene = "q1" | "q2" | "q3" | "q4" | "summary";
type Props = { scene: QuizScene; answer?: string; compact: boolean };

// q1: sand grains, agitation reflects the answer
function Grains({ answer }: { answer?: string }) {
  const pack = useMemo(() => buildPack(70, 31, { x: 7, y: 4, z: 3 }), []);
  const geo = useMemo(() => makeGrainGeometry(2.2, 2), []);
  const mesh = useRef<THREE.InstancedMesh>(null), tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler() }), []);
  useLayoutEffect(() => { const m = mesh.current; if (!m) return; for (let i = 0; i < pack.count; i++) m.setColorAt(i, pack.color[i]); if (m.instanceColor) m.instanceColor.needsUpdate = true; }, [pack]);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime, agitation = answer === "major" ? 1 : answer === "sometimes" ? 0.55 : answer === "unsure" ? 0.3 : 0.18, m = mesh.current; if (!m) return;
    for (let i = 0; i < pack.count; i++) {
      tmp.p.fromArray(pack.centers, i * 3).add(tmp.s.set(Math.sin(t * 1.4 + i) * agitation * 0.8, Math.cos(t * 1.1 + i * 1.7) * agitation * 0.8, Math.sin(t * 0.9 + i * 0.6) * agitation * 0.6));
      tmp.q.setFromEuler(tmp.e.set(t * 0.3 * agitation + i, t * 0.2 * agitation + i * 2, i));
      m.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s.copy(pack.stretch[i]).multiplyScalar(pack.radii[i])));
    }
    m.instanceMatrix.needsUpdate = true;
    camera.position.lerp(tmp.p.set(Math.sin(t * 0.1) * 3, 1.5, 15), 0.05); camera.lookAt(0, 0, 0);
  });
  return <instancedMesh ref={mesh} args={[geo, undefined, pack.count]}><meshStandardMaterial color="#ffffff" roughness={0.82} /></instancedMesh>;
}

function MiniWellhead({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={position} scale={scale}>
    <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.45, 0.5, 0.4, 14]} /><meshStandardMaterial color="#8d98a0" metalness={0.8} roughness={0.35} /></mesh>
    <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.17, 0.17, 1.3, 10]} /><meshStandardMaterial color="#9aa5ad" metalness={0.8} roughness={0.3} /></mesh>
    {[0.7, 1.4].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[0.44, 0.22, 0.44]} /><meshStandardMaterial color="#b13a2c" roughness={0.5} /></mesh>)}
  </group>;
}

// q2: producing (oil rising) vs frac (proppant going down into a fracture)
function WorkTypes({ answer }: { answer?: string }) {
  const prod = useRef<THREE.Points>(null), frac = useRef<THREE.Points>(null), dot = useMemo(() => dotTexture(), []);
  const data = useMemo(() => { const r = seeded(9); return { seeds: Array.from({ length: 160 }, () => [r(), (r() - 0.5) * 0.5, (r() - 0.5) * 0.5]), a: new Float32Array(160 * 3), b: new Float32Array(160 * 3) }; }, []);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime, showP = answer === "producing" || answer === "both" || !answer, showF = answer === "fracs" || answer === "both" || !answer;
    data.seeds.forEach(([s, dx, dz], i) => { const u = (s + t * 0.12) % 1; data.a.set([-4 + dx, -5 + u * 7, dz], i * 3); const w = (s + t * 0.15) % 1, spread = w > 0.6 ? (w - 0.6) * 6 : 0; data.b.set([4 + dx + (i % 2 ? spread : -spread) * 0.15, 2 - Math.min(w, 0.6) * 11, dz + (i % 2 ? spread : -spread)], i * 3); });
    if (prod.current) { prod.current.geometry.attributes.position.needsUpdate = true; (prod.current.material as THREE.PointsMaterial).setValues({ opacity: showP ? 0.95 : 0.15 }); }
    if (frac.current) { frac.current.geometry.attributes.position.needsUpdate = true; (frac.current.material as THREE.PointsMaterial).setValues({ opacity: showF ? 0.95 : 0.15 }); }
    camera.position.set(Math.sin(t * 0.15) * 2, 0, 16); camera.lookAt(0, -1, 0);
  });
  return <group>
    <MiniWellhead position={[-4, 2, 0]} scale={1.3} /><MiniWellhead position={[4, 2, 0]} scale={1.3} />
    <mesh position={[-4, -1.5, -0.3]}><cylinderGeometry args={[0.35, 0.35, 7, 12]} /><meshStandardMaterial color="#aab6bd" metalness={0.8} roughness={0.3} transparent opacity={0.35} /></mesh>
    <mesh position={[4, -2.5, -0.3]}><cylinderGeometry args={[0.35, 0.35, 9, 12]} /><meshStandardMaterial color="#aab6bd" metalness={0.8} roughness={0.3} transparent opacity={0.35} /></mesh>
    <mesh position={[4, -7.5, -0.5]} rotation={[0, Math.PI / 2, 0]} scale={[3.5, 1.4, 1]}><circleGeometry args={[1, 32]} /><meshBasicMaterial color="#6b4a20" transparent opacity={0.5} side={THREE.DoubleSide} /></mesh>
    <points ref={prod}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.a, 3]} /></bufferGeometry><pointsMaterial map={dot} size={0.32} color="#c87a24" transparent depthWrite={false} toneMapped={false} /></points>
    <points ref={frac}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.b, 3]} /></bufferGeometry><pointsMaterial map={dot} size={0.22} color="#e3cfa6" transparent depthWrite={false} /></points>
  </group>;
}

// q3: wellheads appear for the selected well count
const WELLS: Record<string, number> = { "1-5": 4, "6-20": 14, "21-50": 36, "50+": 64 };
function WellField({ answer }: { answer?: string }) {
  const target = answer ? WELLS[answer] : 0, groups = useRef<(THREE.Group | null)[]>([]);
  const spots = useMemo(() => { const r = seeded(4); return Array.from({ length: 64 }, (_, i) => [((i % 8) - 3.5) * 2.6 + (r() - 0.5) * 0.8, ((Math.floor(i / 8)) - 3.5) * 2.6 + (r() - 0.5) * 0.8] as [number, number]).sort((a, b) => Math.hypot(...a) - Math.hypot(...b)); }, []);
  useFrame(({ camera, clock }) => {
    groups.current.forEach((g, i) => { if (!g) return; const s = THREE.MathUtils.lerp(g.scale.x, i < target ? 1 : 0.001, 0.12 - Math.min(0.08, i * 0.001)); g.scale.setScalar(s); });
    const t = clock.elapsedTime, d = 26 + target * 0.15; camera.position.set(Math.sin(t * 0.08) * d * 0.7, d * 0.7, Math.cos(t * 0.08) * d * 0.7); camera.lookAt(0, 0, 0);
  });
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[16, 48]} /><meshStandardMaterial color="#2a261f" roughness={1} /></mesh>
    <gridHelper args={[32, 16, "#3a4a50", "#1e2a2f"]} position={[0, 0.02, 0]} />
    {spots.map(([x, z], i) => <group key={i} ref={(g) => { groups.current[i] = g; }} position={[x, 0, z]} scale={0.001}><MiniWellhead position={[0, 0, 0]} /></group>)}
  </group>;
}

// q4: dot globe that turns to and highlights the selected region
const REGIONS: Record<string, { lat: [number, number]; lon: [number, number]; focus: [number, number] }> = {
  canada: { lat: [49, 62], lon: [-132, -100], focus: [55, -115] },
  us: { lat: [25, 49], lon: [-125, -67], focus: [38, -98] },
  middleeast: { lat: [12, 38], lon: [34, 60], focus: [25, 47] },
  elsewhere: { lat: [-90, 90], lon: [-180, 180], focus: [10, 20] },
};
function Globe({ answer }: { answer?: string }) {
  const group = useRef<THREE.Group>(null), dot = useMemo(() => dotTexture(), []), hiRef = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const n = 6000, pos = new Float32Array(n * 3), latlon: [number, number][] = [];
    for (let i = 0; i < n; i++) { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963; pos.set([Math.cos(th) * r * 6, y * 6, Math.sin(th) * r * 6], i * 3); latlon.push([Math.asin(y) * 57.3, Math.atan2(Math.sin(th) * r, Math.cos(th) * r) * -57.3]); }
    return { pos, latlon, hi: new Float32Array(n * 3) };
  }, []);
  const region = answer ? REGIONS[answer] : undefined;
  useLayoutEffect(() => {
    let k = 0; data.hi.fill(0);
    data.latlon.forEach(([lat, lon], i) => { if (region && lat >= region.lat[0] && lat <= region.lat[1] && lon >= region.lon[0] && lon <= region.lon[1] && (answer !== "elsewhere" || i % 7 === 0)) { data.hi.set(data.pos.subarray(i * 3, i * 3 + 3), k * 3); k++; } });
    if (hiRef.current) { hiRef.current.geometry.attributes.position.needsUpdate = true; hiRef.current.geometry.setDrawRange(0, k); }
  }, [region, answer, data]);
  useFrame(({ camera, clock }) => {
    const g = group.current; if (!g) return;
    const targetY = region ? -(region.focus[1] / 57.3) - Math.PI / 2 : clock.elapsedTime * 0.15;
    g.rotation.y = region ? THREE.MathUtils.lerp(g.rotation.y, targetY, 0.05) : targetY;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, region ? (region.focus[0] / 57.3) * 0.85 : 0.3, 0.05);
    camera.position.set(0, 0, 17); camera.lookAt(0, 0, 0);
  });
  return <group ref={group}>
    <mesh><sphereGeometry args={[5.9, 48, 32]} /><meshStandardMaterial color="#0c1218" roughness={1} /></mesh>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.pos, 3]} /></bufferGeometry><pointsMaterial map={dot} size={0.12} color="#7d95a3" transparent depthWrite={false} /></points>
    <points ref={hiRef}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.hi, 3]} /></bufferGeometry><pointsMaterial map={dot} size={0.32} color="#ffd21f" transparent depthWrite={false} toneMapped={false} /></points>
  </group>;
}

// summary: golden web of bonded grains
function Web() {
  const pack = useMemo(() => buildPack(60, 77, { x: 6, y: 4, z: 3 }), []), geo = useMemo(() => makeGrainGeometry(5.5, 2), []);
  const mesh = useRef<THREE.InstancedMesh>(null), group = useRef<THREE.Group>(null);
  const lines = useMemo(() => { const a = new Float32Array(pack.contacts.length * 6); pack.contacts.forEach(([i, j], k) => { a.set(pack.centers.subarray(i * 3, i * 3 + 3), k * 6); a.set(pack.centers.subarray(j * 3, j * 3 + 3), k * 6 + 3); }); return a; }, [pack]);
  useLayoutEffect(() => { const m = mesh.current; if (!m) return; const mtx = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3(); for (let i = 0; i < pack.count; i++) { m.setMatrixAt(i, mtx.compose(p.fromArray(pack.centers, i * 3), pack.rot[i], s.copy(pack.stretch[i]).multiplyScalar(pack.radii[i]))); m.setColorAt(i, pack.color[i]); } m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }, [pack]);
  useFrame(({ clock, camera }) => { group.current?.rotation.set(0.2, clock.elapsedTime * 0.12, 0); camera.position.set(0, 1, 15); camera.lookAt(0, 0, 0); });
  return <group ref={group}>
    <instancedMesh ref={mesh} args={[geo, undefined, pack.count]}><meshStandardMaterial color="#ffffff" roughness={0.82} /></instancedMesh>
    <lineSegments><bufferGeometry><bufferAttribute attach="attributes-position" args={[lines, 3]} /></bufferGeometry><lineBasicMaterial color="#ffd86a" transparent opacity={0.4} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} /></lineSegments>
  </group>;
}

export default function QuizBackdrop({ scene, answer, compact }: Props) {
  return <Canvas dpr={[1, compact ? 1.25 : 1.5]} camera={{ fov: 45, position: [0, 0, 16] }} gl={{ antialias: true }}>
    <color attach="background" args={["#07090c"]} />
    <hemisphereLight args={["#fff1dc", "#2a1c10", 0.7]} />
    <directionalLight position={[-6, 10, 8]} intensity={2} color="#fff0d8" />
    <directionalLight position={[8, -3, -8]} intensity={0.8} color="#8fb0d8" />
    <group key={scene}>
      {scene === "q1" ? <Grains answer={answer} /> : scene === "q2" ? <WorkTypes answer={answer} /> : scene === "q3" ? <WellField answer={answer} /> : scene === "q4" ? <Globe answer={answer} /> : <Web />}
    </group>
  </Canvas>;
}
