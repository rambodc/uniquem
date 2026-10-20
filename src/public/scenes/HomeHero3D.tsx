import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

// Homepage hero: a procedural 1000 L IBC tote (SandWeb yellow) and a green
// steel drum on a slow turntable, with a few molecules and electrons drifting
// around them. The Uniquem mark is applied to the tote label as the original
// PNG texture (never redrawn or recoloured).

const STEEL = new THREE.MeshStandardMaterial({ color: "#c9ced3", metalness: 0.9, roughness: 0.32 });

function labelTexture(text: string) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 360;
  const g = c.getContext("2d")!; g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 360);
  g.fillStyle = "#1c2a22"; g.font = "700 64px system-ui, sans-serif"; g.textAlign = "center"; g.fillText(text, 256, 300);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function Cage() {
  // Galvanized tube grid: 1.2 x 1.0 m footprint, ~1.16 m tall.
  const bars = useMemo(() => {
    const out: { p: [number, number, number]; r: [number, number, number]; l: number }[] = [];
    const W = 1.2, D = 1.0, H = 1.06, y0 = 0.2;
    for (let i = 0; i <= 4; i++) { const y = y0 + (i / 4) * H; out.push({ p: [0, y, D / 2], r: [0, 0, Math.PI / 2], l: W }, { p: [0, y, -D / 2], r: [0, 0, Math.PI / 2], l: W }, { p: [W / 2, y, 0], r: [Math.PI / 2, 0, 0], l: D }, { p: [-W / 2, y, 0], r: [Math.PI / 2, 0, 0], l: D }); }
    for (let i = 0; i <= 6; i++) { const x = -W / 2 + (i / 6) * W; out.push({ p: [x, y0 + H / 2, D / 2], r: [0, 0, 0], l: H }, { p: [x, y0 + H / 2, -D / 2], r: [0, 0, 0], l: H }); }
    for (let i = 1; i < 5; i++) { const z = -D / 2 + (i / 5) * D; out.push({ p: [W / 2, y0 + H / 2, z], r: [0, 0, 0], l: H }, { p: [-W / 2, y0 + H / 2, z], r: [0, 0, 0], l: H }); }
    for (let i = 0; i <= 3; i++) { const x = -W / 2 + (i / 3) * W; out.push({ p: [x, y0 + H, 0], r: [Math.PI / 2, 0, 0], l: D }); }
    return out;
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const setRef = (mesh: THREE.InstancedMesh | null) => {
    ref.current = mesh; if (!mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    bars.forEach((b, i) => { q.setFromEuler(new THREE.Euler(...b.r)); s.set(1, b.l, 1); m.compose(new THREE.Vector3(...b.p), q, s); mesh.setMatrixAt(i, m); });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return <instancedMesh ref={setRef} args={[undefined, STEEL, bars.length]}><cylinderGeometry args={[0.014, 0.014, 1, 8]} /></instancedMesh>;
}

function Tote({ color, label }: { color: string; label: string }) {
  const liquid = useRef<THREE.Mesh>(null);
  const logo = useLoader(THREE.TextureLoader, "/brand/uniquem-mark-180.png");
  const text = useMemo(() => labelTexture(label), [label]);
  useFrame(({ clock }) => { const t = clock.elapsedTime; liquid.current?.rotation.set(Math.sin(t * 1.3) * 0.025, 0, Math.sin(t * 0.9) * 0.03); });
  return <group>
    {/* Steel pallet base with feet */}
    <mesh position={[0, 0.17, 0]} material={STEEL}><boxGeometry args={[1.22, 0.04, 1.02]} /></mesh>
    {[-0.55, 0, 0.55].flatMap((x) => [-0.45, 0, 0.45].map((z) => <mesh key={`${x}${z}`} position={[x, 0.075, z]} material={STEEL}><boxGeometry args={[0.12, 0.15, 0.12]} /></mesh>))}
    {/* Translucent HDPE tank with liquid inside */}
    <RoundedBox args={[1.14, 1.0, 0.95]} radius={0.08} smoothness={3} position={[0, 0.7, 0]}>
      <meshPhysicalMaterial color={color} roughness={0.35} transmission={0.35} thickness={0.4} transparent opacity={0.55} depthWrite={false} />
    </RoundedBox>
    <mesh ref={liquid} position={[0, 0.6, 0]}><boxGeometry args={[1.08, 0.74, 0.89]} /><meshStandardMaterial color={color} roughness={0.18} metalness={0.05} emissive={color} emissiveIntensity={0.08} /></mesh>
    {/* Top fill cap and bottom valve */}
    <mesh position={[0, 1.24, 0]}><cylinderGeometry args={[0.11, 0.11, 0.07, 28]} /><meshStandardMaterial color="#e9ecef" roughness={0.5} /></mesh>
    <mesh position={[0, 0.3, 0.52]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.16, 18]} /><meshStandardMaterial color="#222" roughness={0.5} /></mesh>
    <mesh position={[0.07, 0.36, 0.58]} rotation={[0, 0, -0.5]}><boxGeometry args={[0.16, 0.025, 0.03]} /><meshStandardMaterial color="#c8281e" roughness={0.5} /></mesh>
    <Cage />
    {/* Label: white panel, original logo mark, product name */}
    <mesh position={[-0.12, 0.78, 0.522]}><planeGeometry args={[0.42, 0.3]} /><meshStandardMaterial map={text} roughness={0.6} /></mesh>
    <mesh position={[-0.12, 0.83, 0.524]}><planeGeometry args={[0.16, 0.16]} /><meshBasicMaterial map={logo} transparent toneMapped={false} /></mesh>
  </group>;
}

function Drum({ color }: { color: string }) {
  return <group>
    <mesh position={[0, 0.44, 0]}><cylinderGeometry args={[0.29, 0.29, 0.88, 48]} /><meshStandardMaterial color={color} metalness={0.55} roughness={0.32} /></mesh>
    {[0.3, 0.58].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.292, 0.012, 8, 48]} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.3} /></mesh>)}
    {[0.005, 0.875].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.29, 0.016, 8, 48]} /><meshStandardMaterial color="#d6dbdf" metalness={0.9} roughness={0.25} /></mesh>)}
    <mesh position={[0.15, 0.89, 0]}><cylinderGeometry args={[0.035, 0.035, 0.02, 16]} /><meshStandardMaterial color="#d6dbdf" metalness={0.9} roughness={0.3} /></mesh>
    <mesh position={[-0.17, 0.89, 0.04]}><cylinderGeometry args={[0.025, 0.025, 0.02, 16]} /><meshStandardMaterial color="#d6dbdf" metalness={0.9} roughness={0.3} /></mesh>
  </group>;
}

const MOLECULES = [[-1.5, 1.7, -0.6, 0.11], [1.65, 1.95, -0.4, 0.09], [1.9, 0.6, 0.6, 0.08], [-1.8, 0.5, 0.5, 0.1], [0.2, 2.25, -1, 0.08]] as const;
function Molecule({ p, r, i }: { p: readonly number[]; r: number; i: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { const t = clock.elapsedTime + i * 1.7; g.current?.position.set(p[0], p[1] + Math.sin(t * 0.6) * 0.08, p[2]); g.current?.rotation.set(t * 0.2, t * 0.3, 0); });
  const atoms: [number, number, number][] = [[0, 0, 0], [r * 2.6, r * 1.1, 0], [-r * 2.4, r * 1.3, r], [r * 0.4, -r * 2.6, -r]];
  return <group ref={g}>
    {atoms.map((a, k) => <mesh key={k} position={a}><sphereGeometry args={[k ? r * 0.7 : r, 20, 14]} /><meshStandardMaterial color={k ? "#e9fff0" : "#1fd65a"} emissive={k ? "#0b3d1c" : "#0c6a2a"} roughness={0.3} /></mesh>)}
    {atoms.slice(1).map((a, k) => { const v = new THREE.Vector3(...a), len = v.length(); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); return <mesh key={k} position={v.clone().multiplyScalar(0.5)} quaternion={q}><cylinderGeometry args={[r * 0.18, r * 0.18, len, 8]} /><meshStandardMaterial color="#9fe8b6" roughness={0.4} /></mesh>; })}
  </group>;
}

function Electrons() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { const t = clock.elapsedTime; g.current?.children.forEach((c, i) => { const a = t * (0.5 + i * 0.12) + i * 2.1, rr = 1.75 + (i % 2) * 0.25; c.position.set(Math.cos(a) * rr, 0.9 + Math.sin(a * 1.3) * 0.5, Math.sin(a) * rr * 0.6); }); });
  return <group ref={g}>{Array.from({ length: 6 }, (_, i) => <mesh key={i}><sphereGeometry args={[0.035, 12, 8]} /><meshBasicMaterial color={i % 2 ? "#7dffb4" : "#36e0d0"} toneMapped={false} /></mesh>)}</group>;
}

function Showcase({ compact }: { compact: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    if (g.current) g.current.rotation.y = -0.55 + Math.sin(t * 0.18) * 0.5;
    camera.position.set(Math.sin(t * 0.1) * 0.3, compact ? 1.55 : 1.45, compact ? 5.6 : 4.4); camera.lookAt(0, 0.75, 0);
  });
  return <>
    <group ref={g}>
      <group position={[-0.32, 0, 0]}><Tote color="#f5c400" label="SandWeb" /></group>
      <group position={[0.78, 0, 0.62]} rotation={[0, 0.4, 0]}><Drum color="#128a3e" /></group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}><circleGeometry args={[1.75, 64]} /><meshStandardMaterial color="#0d2219" metalness={0.3} roughness={0.55} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><ringGeometry args={[1.72, 1.76, 96]} /><meshBasicMaterial color="#1fd65a" toneMapped={false} /></mesh>
    </group>
    {MOLECULES.map((m, i) => <Molecule key={i} p={m} r={m[3]} i={i} />)}
    <Electrons />
  </>;
}

export default function HomeHero3D({ compact, still, onReady }: { compact: boolean; still: boolean; onReady: () => void }) {
  return <Canvas frameloop={still ? "demand" : "always"} dpr={[1, compact ? 1.5 : 1.75]} camera={{ fov: compact ? 42 : 36, position: [0, 1.45, 4.4] }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} onCreated={() => onReady()}>
    <ambientLight intensity={0.35} />
    <directionalLight position={[3, 5, 4]} intensity={2.2} />
    <pointLight position={[-2.5, 1.5, 1.5]} intensity={6} color="#3dff7a" distance={6} />
    <Environment resolution={128}>
      <Lightformer form="rect" intensity={3} position={[0, 4, 2]} scale={[6, 2, 1]} />
      <Lightformer form="rect" intensity={1.5} color="#6dffa8" position={[-4, 1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[4, 2, 1]} />
      <Lightformer form="rect" intensity={1} position={[4, 1, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 2, 1]} />
    </Environment>
    <Suspense fallback={null}><Showcase compact={compact} /></Suspense>
  </Canvas>;
}
