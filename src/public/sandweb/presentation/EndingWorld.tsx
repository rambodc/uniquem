import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { dotTexture, seeded, smooth } from "./world3d";

// Ending: abstract chemistry around the Uniquem mark (the logo itself is an
// untouched <img> overlay; this scene only renders effects around/behind it).
const PALETTE = ["#00c21a", "#1db93a", "#3dff7a", "#7dff4a", "#2ee6c8", "#36c8ff", "#a6ff3d", "#e8fff0", "#7a8cff"];
const up = new THREE.Vector3(0, 1, 0);
type Anchor = RefObject<HTMLElement | null>;

function Orbit({ radius, tilt, speed, color, electrons }: { radius: number; tilt: [number, number, number]; speed: number; color: string; electrons: number }) {
  const g = useRef<THREE.Group>(null), e = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    g.current?.rotation.set(tilt[0], tilt[1] + t * 0.08, tilt[2]);
    e.current.forEach((m, i) => { const a = t * speed + (i / electrons) * Math.PI * 2; m?.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0); });
  });
  return <group ref={g}>
    <mesh><torusGeometry args={[radius, 0.018, 8, 160]} /><meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} /></mesh>
    {Array.from({ length: electrons }, (_, i) => <mesh key={i} ref={(m) => { e.current[i] = m; }}><sphereGeometry args={[0.11, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>)}
  </group>;
}

function Molecule({ center, seed, delay }: { center: THREE.Vector3; seed: number; delay: number }) {
  const spec = useMemo(() => {
    const r = seeded(seed), n = 2 + Math.floor(r() * 4), core = PALETTE[Math.floor(r() * 4)];
    const atoms = Array.from({ length: n }, (_, i) => { const d = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize(); return { dir: d, len: 0.75 + r() * 0.35, size: 0.16 + r() * 0.14, color: PALETTE[(i * 3 + Math.floor(r() * 9)) % PALETTE.length] }; });
    return { atoms, core, size: 0.3 + r() * 0.12, spin: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), rate: 0.25 + r() * 0.35 };
  }, [seed]);
  const group = useRef<THREE.Group>(null), atomRefs = useRef<(THREE.Mesh | null)[]>([]), bondRefs = useRef<(THREE.Mesh | null)[]>([]);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion() }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime, cyc = ((t - delay) % 9 + 9) % 9, f = smooth(Math.min(1, cyc / 2.2)) * (cyc > 8 ? 1 - smooth((cyc - 8) / 1) : 1);
    group.current?.quaternion.setFromAxisAngle(spec.spin, t * spec.rate);
    group.current?.position.set(center.x, center.y + Math.sin(t * 0.6 + seed) * 0.25, center.z);
    spec.atoms.forEach((a, i) => {
      const L = a.len * (1 + 1.6 * (1 - f));
      atomRefs.current[i]?.position.copy(tmp.p.copy(a.dir).multiplyScalar(L));
      const b = bondRefs.current[i];
      if (b) { b.position.copy(tmp.p.copy(a.dir).multiplyScalar(L / 2)); b.quaternion.copy(tmp.q.setFromUnitVectors(up, a.dir)); b.scale.set(1, Math.max(0.001, L * f), 1); }
    });
  });
  return <group ref={group}>
    <mesh><sphereGeometry args={[spec.size, 24, 16]} /><meshStandardMaterial color={spec.core} emissive={spec.core} emissiveIntensity={0.45} roughness={0.25} metalness={0.1} /></mesh>
    {spec.atoms.map((a, i) => <group key={i}>
      <mesh ref={(m) => { atomRefs.current[i] = m; }}><sphereGeometry args={[a.size, 20, 14]} /><meshStandardMaterial color={a.color} emissive={a.color} emissiveIntensity={0.35} roughness={0.3} /></mesh>
      <mesh ref={(m) => { bondRefs.current[i] = m; }}><cylinderGeometry args={[0.045, 0.045, 1, 8]} /><meshBasicMaterial color="#b8ffd0" transparent opacity={0.8} toneMapped={false} /></mesh>
    </group>)}
  </group>;
}

function Dust({ compact }: { compact: boolean }) {
  const pts = useRef<THREE.Points>(null), dot = useMemo(() => dotTexture(), []);
  const data = useMemo(() => {
    const r = seeded(5), n = compact ? 700 : 1500, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) { const d = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(3 + Math.pow(r(), 0.6) * 14); pos.set([d.x, d.y, d.z * 0.6], i * 3); c.set(PALETTE[Math.floor(r() * PALETTE.length)]); col.set([c.r, c.g, c.b], i * 3); }
    return { pos, col };
  }, [compact]);
  useFrame(({ clock }) => { pts.current?.rotation.set(0.15, clock.elapsedTime * 0.04, 0); });
  return <points ref={pts}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.pos, 3]} /><bufferAttribute attach="attributes-color" args={[data.col, 3]} /></bufferGeometry><pointsMaterial map={dot} vertexColors size={0.14} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>;
}

function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(10,60,30,0.2)"); g.addColorStop(0.18, "rgba(40,220,110,0.42)"); g.addColorStop(0.4, "rgba(0,150,90,0.24)"); g.addColorStop(0.65, "rgba(20,90,120,0.14)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function Scene({ anchor, compact }: { anchor: Anchor; compact: boolean }) {
  const root = useRef<THREE.Group>(null), { camera, size } = useThree();
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), d: new THREE.Vector3() }), []);
  const mols = useMemo(() => { const r = seeded(77), n = compact ? 7 : 11; return Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + r() * 0.4, rad = (compact ? 4.6 : 6.2) + r() * 2.4; return { c: new THREE.Vector3(Math.cos(a) * rad * (compact ? 0.75 : 1.25), Math.sin(a) * rad * (compact ? 1.25 : 0.8), -1 - r() * 3), seed: 100 + i * 17, delay: r() * 6 }; }); }, [compact]);
  useFrame(() => {
    // Keep the chemistry centred on the logo's on-screen position (z = 0 plane).
    const el = anchor.current, g = root.current; if (!el || !g) return;
    const rect = el.getBoundingClientRect(), x = ((rect.left + rect.width / 2) / size.width) * 2 - 1, y = -((rect.top + rect.height / 2) / size.height) * 2 + 1;
    tmp.v.set(x, y, 0.5).unproject(camera); tmp.d.copy(tmp.v).sub(camera.position).normalize();
    const k = -camera.position.z / tmp.d.z; g.position.lerp(tmp.v.copy(camera.position).addScaledVector(tmp.d, k), 0.2);
  });
  const glow = useMemo(() => glowTexture(), []);
  return <group ref={root}>
    <mesh position={[0, 0, -10]} scale={compact ? 34 : 40}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={glow} transparent depthWrite={false} toneMapped={false} /></mesh>
    <ambientLight intensity={0.5} />
    <pointLight position={[0, 0, 6]} intensity={40} color="#9dffc0" distance={30} />
    <Orbit radius={2.3} tilt={[1.2, 0, 0.3]} speed={1.6} color="#3dff7a" electrons={2} />
    <Orbit radius={2.6} tilt={[0.4, 0.9, -0.6]} speed={-1.25} color="#2ee6c8" electrons={2} />
    <Orbit radius={2.95} tilt={[-0.6, -0.7, 0.9]} speed={1.05} color="#a6ff3d" electrons={1} />
    {mols.map((m) => <Molecule key={m.seed} center={m.c} seed={m.seed} delay={m.delay} />)}
    <Dust compact={compact} />
  </group>;
}

export default function EndingWorld({ anchor, compact }: { anchor: Anchor; compact: boolean }) {
  return <Canvas dpr={[1, compact ? 1.4 : 1.75]} camera={{ fov: compact ? 58 : 45, position: [0, 0, 16] }} gl={{ antialias: true }}>
    <color attach="background" args={["#020b07"]} />
    <Scene anchor={anchor} compact={compact} />
    <EffectComposer multisampling={0}><Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.6} luminanceSmoothing={0.25} /></EffectComposer>
  </Canvas>;
}
