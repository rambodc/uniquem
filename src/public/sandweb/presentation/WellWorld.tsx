import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Mode } from "./PoreWorld";
import { dotTexture, ramp, rockTexture, seeded, skyTexture, smooth } from "./world3d";

type Props = { mode: Mode; progress: { current: number }; compact: boolean };
const RES_Y = -36, PERFS = [22, 34, 46, 58], Z = 0.7;
const STRATA = [
  { top: 0, bottom: -5, color: "#6a5538", seed: 1 },       // glacial till
  { top: -5, bottom: -13, color: "#8c4b36", seed: 2 },     // red-bed siltstone
  { top: -13, bottom: -20, color: "#4d5d6b", seed: 3 },    // blue-grey shale
  { top: -20, bottom: -21.5, color: "#262320", seed: 4 },  // thin coal seam
  { top: -21.5, bottom: -31, color: "#9c7942", seed: 5 },  // ochre siltstone
  { top: -31, bottom: -41, color: "#c39b64", seed: 6, reservoir: true }, // reservoir sandstone
  { top: -41, bottom: -52, color: "#3f514e", seed: 7 },    // grey-green shale
];
const v3 = (x: number, y: number, z = Z) => new THREE.Vector3(x, y, z);

function wellPath() {
  const p = new THREE.CurvePath<THREE.Vector3>();
  p.add(new THREE.LineCurve3(v3(0, 1.2), v3(0, -27)));
  p.add(new THREE.QuadraticBezierCurve3(v3(0, -27), v3(0, RES_Y), v3(9, RES_Y)));
  p.add(new THREE.LineCurve3(v3(9, RES_Y), v3(64, RES_Y)));
  return p;
}

// Formation-scale cutaway: wellhead and flowline at surface (no rig), strata
// section, horizontal well with perforations and fractures in the sandstone.
export default function WellWorld({ mode, progress, compact }: Props) {
  const path = useMemo(() => wellPath(), []);
  const casing = useMemo(() => new THREE.TubeGeometry(path, 240, 0.55, 16, false), [path]);
  const core = useMemo(() => new THREE.TubeGeometry(path, 240, 0.3, 10, false), [path]);
  const pts = useMemo(() => path.getSpacedPoints(800), [path]);
  const surface = useMemo(() => [v3(0, 1.6), v3(12, 1.6)], []);
  const textures = useMemo(() => ({ strata: STRATA.map((s) => { const t = rockTexture(s.color, s.seed, true); t.repeat.set(6, 1); return t; }), dot: dotTexture(), sky: skyTexture(), ground: (() => { const g = rockTexture("#4a6236", 11, false); g.repeat.set(10, 3); return g; })() }), []);
  const flowCount = compact ? 180 : 420, sandCount = compact ? 90 : 220, migCount = compact ? 120 : 260;
  const data = useMemo(() => {
    const r = seeded(5);
    return {
      flow: Array.from({ length: flowCount }, () => [r(), (r() - 0.5) * 0.36, (r() - 0.5) * 0.36]),
      sand: Array.from({ length: sandCount }, () => [r(), (r() - 0.5) * 0.3, (r() - 0.5) * 0.3]),
      mig: Array.from({ length: migCount }, () => { const perf = PERFS[Math.floor(r() * PERFS.length)], a = r() * 6.28, d = 1.5 + r() * 6; return [perf, Math.cos(a) * d * 0.6, Math.sin(a) * d, r()]; }),
      speck: (() => { const a = new Float32Array((compact ? 400 : 1000) * 3); for (let i = 0; i < a.length / 3; i++) { const perf = PERFS[i % 4]; a.set([perf + (r() - 0.5) * 0.45, RES_Y + (r() - 0.5) * 8.4 * Math.sqrt(r()), 0.06], i * 3); } return a; })(),
      flowPos: new Float32Array(flowCount * 3), sandPos: new Float32Array(sandCount * 3), migPos: new Float32Array(migCount * 3), v: new THREE.Vector3(),
    };
  }, [flowCount, sandCount, migCount, compact]);
  const flow = useRef<THREE.Points>(null), sand = useRef<THREE.Points>(null), mig = useRef<THREE.Points>(null);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null), chokeMat = useRef<THREE.MeshStandardMaterial>(null), pile = useRef<THREE.Mesh>(null), zones = useRef<(THREE.Mesh | null)[]>([]), status = useRef<THREE.MeshBasicMaterial>(null);

  // Sample the well path from the toe (u=0) to the wellhead and along the flowline.
  const sampleUp = (u: number, out: THREE.Vector3) => {
    if (u > 0.9) return out.lerpVectors(surface[0], surface[1], (u - 0.9) / 0.1);
    const f = (1 - u / 0.9) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f));
    return out.lerpVectors(pts[i], pts[i + 1], f - i);
  };

  useFrame(({ camera, clock }) => {
    const p = progress.current, t = clock.elapsedTime, v = data.v;
    const producing = mode !== "treat", rate = mode === "clean" ? 0.11 : 0.055;
    const fl = flow.current;
    if (fl) {
      data.flow.forEach(([seed, dy, dz], i) => {
        if (producing) sampleUp((seed + t * rate) % 1, v);
        else { const u = (seed + t * 0.06) % 1; sampleUp(0.9 - u * 0.9 * Math.min(1, 0.25 + p * 1.4), v); }
        data.flowPos.set([v.x + dy, v.y + dz, v.z + dz], i * 3);
      });
      fl.geometry.attributes.position.needsUpdate = true;
      (fl.material as THREE.PointsMaterial).setValues({ color: new THREE.Color(mode === "treat" ? "#3dff6e" : "#e08a2a"), size: mode === "treat" ? 0.75 : 0.65, opacity: mode === "clean" ? 0.95 : 0.85 });
    }
    const sd = sand.current;
    if (sd) {
      sd.visible = mode === "sand";
      if (sd.visible) { data.sand.forEach(([seed, dy, dz], i) => { sampleUp((seed + t * 0.05) % 1, v); data.sandPos.set([v.x + dy, v.y + dz, v.z + 0.2], i * 3); }); sd.geometry.attributes.position.needsUpdate = true; }
    }
    // Formation sand/fines migrating into the perforations (sand mode only).
    const mg = mig.current;
    if (mg) {
      mg.visible = mode === "sand";
      if (mg.visible) {
        data.mig.forEach(([perf, dy, dz, seed], i) => { const life = (seed + t * 0.22) % 1, e = life * life; data.migPos.set([perf + dy * (1 - e) * 0.3 + (dz * 0.15) * (1 - e), RES_Y + dy * 4 * (1 - e) + dz * 0.4 * (1 - e), Z + 0.1], i * 3); });
        mg.geometry.attributes.position.needsUpdate = true;
      }
    }
    coreMat.current?.emissive.set(mode === "treat" ? "#0a8a2a" : "#3a1e06");
    const wear = mode === "sand" ? ramp(p, 0.2, 0.7) : 0;
    chokeMat.current?.emissive.setRGB(0.9 * wear * (0.6 + 0.4 * Math.sin(t * 5)), 0.12 * wear, 0.05 * wear);
    pile.current?.scale.setScalar(Math.max(0.001, mode === "sand" ? 0.3 + 0.9 * ramp(p, 0.1, 0.9) : 0.001));
    status.current?.color.set(mode === "clean" ? "#3df07a" : mode === "sand" ? "#ff4a2a" : "#36e0d0");
    const zoneScale = mode === "treat" ? 0.2 + 5.5 * ramp(p, 0.45, 1) : mode === "clean" ? 5.5 : 0.001;
    zones.current.forEach((z) => { z?.scale.set(zoneScale * 0.38, zoneScale * 0.95, 1); });
    // Camera moves: wide → perforations (sand, treat); perforations → wide (clean).
    const WIDE = compact ? [8, 22, 122, 28, -18] : [-14, 18, 66, 26, -17], PERF = compact ? [36, -26, 40, 40, -35.5] : [30, -27, 24, 40, -35.5];
    if (mode === "treat") {
      // Follow the SandWeb front down the wellbore to the perforations.
      sampleUp(0.9 - 0.9 * Math.min(1, 0.12 + smooth(p) * 1.05), v);
      camera.position.set(v.x + 8 + Math.sin(t * 0.2) * 0.6, v.y + 6, compact ? 44 : 30); camera.lookAt(v.x + 4, v.y - 1, -1);
      return;
    }
    const kk = mode === "sand" ? smooth(ramp(p, 0.3, 1)) : smooth(Math.min(1, p * 1.6));
    const from = mode === "sand" ? WIDE : PERF, to = mode === "sand" ? PERF : WIDE;
    const lerp = (i: number) => THREE.MathUtils.lerp(from[i], to[i], kk);
    camera.position.set(lerp(0) + Math.sin(t * 0.2) * 0.6, lerp(1), lerp(2)); camera.lookAt(lerp(3), lerp(4), -1);
  });

  const W0 = -40, W1 = 90;
  return <group>
    <color attach="background" args={["#0b1714"]} />
    <fog attach="fog" args={["#0f1d19", 90, 260]} />
    <mesh scale={400}><sphereGeometry args={[1, 32, 16]} /><meshBasicMaterial map={textures.sky} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
    <hemisphereLight args={["#cdeedd", "#4a3424", 0.8]} />
    <directionalLight position={[30, 50, 60]} intensity={1.9} color="#ffeccc" />
    <directionalLight position={[-60, 20, -40]} intensity={0.7} color="#7fd8ff" />
    <pointLight position={[40, RES_Y, 10]} color={mode === "treat" ? "#3dff7a" : "#ffb070"} intensity={mode === "sand" ? 40 : 90} distance={40} />
    {/* Strata cutaway */}
    {STRATA.map((s, i) => <mesh key={s.top} position={[(W0 + W1) / 2, (s.top + s.bottom) / 2, -15]}><boxGeometry args={[W1 - W0, s.top - s.bottom, 30]} /><meshStandardMaterial map={textures.strata[i]} color="#ffffff" roughness={0.95} /></mesh>)}
    <mesh position={[(W0 + W1) / 2, 0.03, -15]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[W1 - W0, 30]} /><meshStandardMaterial map={textures.ground} color="#ffffff" roughness={1} /></mesh>
    {/* Fractures with fine proppant specks, and treated zones */}
    {PERFS.map((x, i) => <group key={x}>
      <mesh position={[x, RES_Y, 0.02]} scale={[0.32, 4.6, 1]}><circleGeometry args={[1, 32]} /><meshStandardMaterial color="#7a5f3c" roughness={1} /></mesh>
      <mesh ref={(m) => { zones.current[i] = m; }} position={[x, RES_Y, Z - 0.05]}><circleGeometry args={[1, 40]} /><meshBasicMaterial color="#2dff6a" transparent opacity={mode === "clean" ? 0.07 : 0.12} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      <mesh position={[x, RES_Y, Z]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.62, 0.07, 8, 24]} /><meshStandardMaterial color="#9aa6ae" metalness={0.9} roughness={0.3} /></mesh>
    </group>)}
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.speck, 3]} /></bufferGeometry><pointsMaterial map={textures.dot} color="#d8c29a" size={0.16} transparent depthWrite={false} /></points>
    {/* Wellbore */}
    <mesh geometry={casing}><meshStandardMaterial color="#aab6bd" metalness={0.85} roughness={0.3} transparent opacity={0.45} depthWrite={false} /></mesh>
    <mesh geometry={core}><meshStandardMaterial ref={coreMat} color="#1b1209" emissive="#3a1e06" roughness={0.4} transparent opacity={0.45} depthWrite={false} /></mesh>
    <points ref={flow} frustumCulled={false} renderOrder={3}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.flowPos, 3]} /></bufferGeometry><pointsMaterial map={textures.dot} size={0.36} color="#b8661c" transparent depthWrite={false} toneMapped={false} /></points>
    <points ref={sand} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.sandPos, 3]} /></bufferGeometry><pointsMaterial map={textures.dot} size={0.42} color="#e8d6ad" transparent depthWrite={false} /></points>
    <points ref={mig} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.migPos, 3]} /></bufferGeometry><pointsMaterial map={textures.dot} size={0.3} color="#e0cba3" transparent depthWrite={false} /></points>
    {/* Surface: wellhead (christmas tree), flowline, choke, separator. No rig. */}
    <group position={[0, 0, Z]}>
      <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.75, 0.85, 0.7, 20]} /><meshStandardMaterial color="#8d98a0" metalness={0.8} roughness={0.35} /></mesh>
      <mesh position={[0, 1.7, 0]}><cylinderGeometry args={[0.3, 0.3, 2.2, 16]} /><meshStandardMaterial color="#9aa5ad" metalness={0.8} roughness={0.3} /></mesh>
      {[1.1, 2.3].map((y) => <group key={y} position={[0, y, 0]}><mesh><boxGeometry args={[0.75, 0.38, 0.75]} /><meshStandardMaterial color="#b13a2c" roughness={0.5} /></mesh><mesh position={[0, 0, 0.55]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.28, 0.05, 8, 20]} /><meshStandardMaterial color="#222" /></mesh></group>)}
      <mesh position={[0, 2.95, 0]}><cylinderGeometry args={[0.36, 0.36, 0.25, 16]} /><meshStandardMaterial color="#8d98a0" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[6, 1.6, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.14, 0.14, 12, 10]} /><meshStandardMaterial color="#5f6b73" metalness={0.7} roughness={0.4} /></mesh>
      <mesh position={[5, 1.6, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 1.1, 16]} /><meshStandardMaterial ref={chokeMat} color="#8d98a0" metalness={0.7} roughness={0.35} /></mesh>
      <mesh position={[14, 1.5, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.2, 1.2, 4.5, 24]} /><meshStandardMaterial color="#a7b0b5" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[14, 3, 0.9]}><sphereGeometry args={[0.18, 12, 10]} /><meshBasicMaterial ref={status} color="#36e0d0" toneMapped={false} /></mesh>
      <mesh ref={pile} position={[11.2, 0.05, 1.5]}><coneGeometry args={[1, 0.7, 18]} /><meshStandardMaterial color="#cdb68e" roughness={1} /></mesh>
    </group>
  </group>;
}
