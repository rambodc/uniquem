import { Float, Sparkles, Trail } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { publicProducts } from "../products";
import { COMPOSER_SAMPLES, QualityMonitor, useAdaptiveDpr } from "../scenes/quality";
import { buildMarkGeometry, loadMarkTexture } from "./markGeometry";
import "./screensaver.css";

// Abstract Uniquem screensaver: the traced logo (original PNG on the front
// faces, very thin extrusion) turning slowly in deep space, with glowing
// electrons on elliptical orbits, floating molecules, nebula glow, stars and
// soft energy rings. Greens with teal / emerald / cyan accents, no yellow.

const MARK_DEPTH_PX = 10; // very thin extrusion (traced shapes are in 1100 x 693 px space)
const LOGO_SHARE = 0.36; // logo width as a share of the viewport's short side
const FOV = 38;

type Env = { compact: boolean; still: boolean };
function seeded(seed: number) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
const glow = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);

function radialTexture(inner: string, outer = "rgba(0,0,0,0)") {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!, grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner); grd.addColorStop(1, outer);
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function Logo({ still }: Env) {
  const group = useRef<THREE.Group>(null);
  const { geos } = useMemo(() => buildMarkGeometry(MARK_DEPTH_PX), []);
  const materials = useMemo(() => {
    const front = new THREE.MeshBasicMaterial({ map: loadMarkTexture() }); // the PNG, colour for colour
    const side = new THREE.MeshStandardMaterial({ color: "#0b8f22", emissive: "#04310c", roughness: 0.4, metalness: 0.2 });
    return [front, side];
  }, []);
  useFrame(({ clock }) => {
    const g = group.current; if (!g || still) return;
    const t = clock.elapsedTime;
    g.rotation.y = 0.55 * Math.sin(t * 0.11);
    g.rotation.x = 0.08 * Math.sin(t * 0.07 + 1);
    g.position.y = 0.12 * Math.sin(t * 0.25);
  });
  return <group ref={group}>{geos.map((g, i) => <mesh key={i} geometry={g} material={materials} />)}</group>;
}

function Halo({ still }: Env) {
  const ref = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => radialTexture("rgba(40,230,120,0.55)"), []);
  useFrame(({ clock }) => { if (ref.current && !still) { const s = 13 + 0.8 * Math.sin(clock.elapsedTime * 0.4); ref.current.scale.set(s, s, 1); } });
  return <sprite ref={ref} position={[0, 0, -2.5]} scale={[13, 13, 1]}><spriteMaterial map={tex} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>;
}

function Nebula({ still }: Env) {
  const clouds = useMemo(() => [
    { c: "rgba(20,160,80,0.42)", p: [-16, 7, -40], s: 46 },
    { c: "rgba(10,150,140,0.38)", p: [18, -6, -45], s: 52 },
    { c: "rgba(20,110,170,0.30)", p: [6, 14, -55], s: 58 },
    { c: "rgba(40,210,110,0.22)", p: [-6, -14, -35], s: 40 },
    { c: "rgba(12,90,70,0.40)", p: [0, 0, -70], s: 90 },
  ].map((n) => ({ ...n, tex: radialTexture(n.c) })), []);
  const group = useRef<THREE.Group>(null), size = useThree((s) => s.size), tall = Math.max(1, size.height / size.width);
  useFrame((_, dt) => { if (group.current && !still) group.current.rotation.z += dt * 0.006; });
  return <group ref={group} scale={[1, tall, 1]}>{clouds.map((n, i) => <sprite key={i} position={n.p as [number, number, number]} scale={[n.s, n.s, 1]}><spriteMaterial map={n.tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>)}</group>;
}

function Stars({ still }: Env) {
  const count = 1800;
  const { pos, col, tex } = useMemo(() => {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    const rnd = seeded(7);
    const palette = ["#ffffff", "#c9fff0", "#9dffc8", "#8ae8ff"].map((h) => new THREE.Color(h));
    for (let i = 0; i < count; i++) {
      const r = 35 + rnd() * 70, th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), -Math.abs(r * Math.cos(ph)) * 0.8 - 10], i * 3);
      const c = palette[i % palette.length], k = 0.5 + rnd() * 0.9; col.set([c.r * k, c.g * k, c.b * k], i * 3);
    }
    return { pos, col, tex: radialTexture("rgba(255,255,255,1)") };
  }, [count]);
  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => { if (ref.current && !still) { ref.current.rotation.y += dt * 0.004; ref.current.rotation.x += dt * 0.0015; } });
  return <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /><bufferAttribute attach="attributes-color" args={[col, 3]} /></bufferGeometry><pointsMaterial map={tex} size={0.32} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>;
}

const ORBITS = [
  { a: 8.6, b: 3.0, rot: [1.15, 0.25, 0.35], speed: 0.32, color: "#3dff8a", electrons: [0, Math.PI] },
  { a: 9.4, b: 3.4, rot: [1.3, -0.5, -0.6], speed: -0.24, color: "#2ee6d6", electrons: [1.2] },
  { a: 7.8, b: 2.6, rot: [1.0, 0.9, 1.4], speed: 0.27, color: "#5ad8ff", electrons: [2.4, 5.2] },
] as const;

function Electron({ a, b, speed, phase, color, still }: { a: number; b: number; speed: number; phase: number; color: string; still: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { const th = (still ? 0 : clock.elapsedTime * speed) + phase; ref.current?.position.set(a * Math.cos(th), b * Math.sin(th), 0); });
  const mesh = <mesh ref={ref}><sphereGeometry args={[0.13, 16, 12]} /><meshBasicMaterial color={glow(color, 3.2)} toneMapped={false} /></mesh>;
  return still ? mesh : <Trail width={1.1} length={7} decay={1.2} color={glow(color, 1.6)} attenuation={(w) => w * w}>{mesh}</Trail>;
}

function OrbitLine({ a, b, color }: { a: number; b: number; color: string }) {
  const line = useMemo(() => {
    const pts = Array.from({ length: 161 }, (_, k) => { const th = (k / 160) * Math.PI * 2; return new THREE.Vector3(a * Math.cos(th), b * Math.sin(th), 0); });
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending }));
  }, [a, b, color]);
  return <primitive object={line} />;
}

function Orbits({ still }: Env) {
  return <>{ORBITS.map((o, i) => {
    return <group key={i} rotation={o.rot as unknown as [number, number, number]}>
      <OrbitLine a={o.a} b={o.b} color={o.color} />
      {o.electrons.map((p) => <Electron key={p} a={o.a} b={o.b} speed={o.speed} phase={p} color={o.color} still={still} />)}
    </group>;
  })}</>;
}

// Small abstract molecules: atoms (spheres) joined by bonds (cylinders).
type Mol = { atoms: [number, number, number][]; bonds: [number, number][]; color: string; pos: [number, number, number]; scale: number }; // pos = [fraction of half-width, fraction of half-height, z]
function ring(n: number, r: number): [number, number, number][] { return Array.from({ length: n }, (_, i) => [r * Math.cos((i / n) * Math.PI * 2), r * Math.sin((i / n) * Math.PI * 2), 0]); }
const MOLECULES: Mol[] = [
  { atoms: ring(6, 1.3), bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]], color: "#22e07a", pos: [-0.7, 0.56, -9], scale: 1 },
  { atoms: [[0, 0, 0], [1.1, 0.8, 0.3], [-1.2, 0.7, -0.2], [0.1, -1.3, 0.5], [0.2, 0.2, -1.3]], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]], color: "#2ee6d6", pos: [0.72, 0.5, -11], scale: 1.05 },
  { atoms: [[0, 0, 0], [1.25, 0.7, 0], [-1.25, 0.7, 0]], bonds: [[0, 1], [0, 2]], color: "#5ad8ff", pos: [0.66, -0.6, -6], scale: 0.9 },
  { atoms: [[-1.8, 0, 0], [-0.6, 0.7, 0], [0.6, 0, 0.2], [1.8, 0.7, 0]], bonds: [[0, 1], [1, 2], [2, 3]], color: "#3dff8a", pos: [-0.68, -0.58, -7], scale: 0.95 },
  { atoms: [...ring(5, 1.1), [0, 0, 1.4]], bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 5], [2, 5]], color: "#19c99a", pos: [0.06, 0.8, -16], scale: 1 },
];
function Molecule({ m, compact }: { m: Mol; compact: boolean }) {
  const mats = useMemo(() => ({
    atom: new THREE.MeshStandardMaterial({ color: m.color, emissive: glow(m.color, 0.9), roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.9, toneMapped: false }),
    bond: new THREE.MeshStandardMaterial({ color: m.color, emissive: glow(m.color, 0.35), roughness: 0.4, transparent: true, opacity: 0.55 }),
  }), [m.color]);
  const bonds = useMemo(() => m.bonds.map(([i, j]) => {
    const a = new THREE.Vector3(...m.atoms[i]), b = new THREE.Vector3(...m.atoms[j]), mid = a.clone().add(b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return { mid, q, len: a.distanceTo(b) };
  }), [m]);
  const view = useView(), [fx, fy, z] = m.pos, { hw, hh } = view.at(z);
  // Keep molecules clear of the logo and its orbits on tall phone screens.
  const pos: [number, number, number] = [fx * hw, (compact ? Math.sign(fy) * (0.45 + Math.abs(fy) * 0.45) : fy) * hh, z];
  return <Float speed={0.6} rotationIntensity={0.6} floatIntensity={0.8} floatingRange={[-0.4, 0.4]}>
    <group position={pos} scale={m.scale}>
      {m.atoms.map((p, i) => <mesh key={i} position={p} material={mats.atom}><sphereGeometry args={[i === 0 ? 0.36 : 0.27, 24, 16]} /></mesh>)}
      {bonds.map((b, i) => <mesh key={i} position={b.mid} quaternion={b.q} material={mats.bond}><cylinderGeometry args={[0.06, 0.06, b.len, 8]} /></mesh>)}
    </group>
  </Float>;
}

function EnergyRings({ still }: Env) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(() => ["#2ee6a0", "#3ad6ff"].map((c) => new THREE.MeshBasicMaterial({ color: glow(c, 1.4), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })), []);
  useFrame(({ clock }) => {
    refs.current.forEach((m, i) => {
      if (!m) return;
      const k = still ? 0.5 : ((clock.elapsedTime / 9 + i * 0.5) % 1); // expand and fade every 9 s
      const s = 5.5 + k * 8; m.scale.set(s, s * 0.62, 1);
      mats[i].opacity = 0.11 * Math.sin(Math.PI * k);
    });
  });
  return <group position={[0, 0, -1.5]} rotation={[0.2, 0, 0]}>{mats.map((mat, i) => <mesh key={i} ref={(m) => { refs.current[i] = m; }} material={mat}><ringGeometry args={[0.985, 1, 128]} /></mesh>)}</group>;
}

/** Camera distance so the logo spans LOGO_SHARE of the viewport's short side,
 * and the visible half-extents at depth z (for placing things around the edges). */
function useView() {
  const size = useThree((s) => s.size);
  return useMemo(() => {
    const short = Math.min(size.width, size.height), tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = (10.5 * size.height) / (2 * tan * LOGO_SHARE * short);
    const at = (z: number) => { const h = (dist - z) * tan; return { hw: h * (size.width / size.height), hh: h }; };
    return { dist, at };
  }, [size]);
}

/** Places the camera and adds a very slow drift. */
function Rig({ still }: Env) {
  const get = useThree((s) => s.get), view = useView(), dist = useRef(30);
  useLayoutEffect(() => {
    dist.current = view.dist;
    const cam = get().camera; cam.position.set(0, 0, view.dist); cam.lookAt(0, 0, 0);
  }, [get, view]);
  useFrame(({ camera, clock }) => {
    if (still) return;
    const t = clock.elapsedTime;
    camera.position.set(Math.sin(t * 0.05) * 1.2, Math.sin(t * 0.037) * 0.6, dist.current); camera.lookAt(0, 0, 0);
  });
  return null;
}

const SLIDES: { title: string; sub?: string; brand?: boolean }[] = [
  { title: "Uniquem", brand: true },
  { title: "The Chemical Company" },
  ...(["sandweb", "elixir", "kaolok", "unistop"] as const).map((slug) => { const p = publicProducts.find((x) => x.slug === slug)!; return { title: p.name, sub: slug === "sandweb" ? "Sand consolidation chemistry" : p.category }; }),
];

function Captions() {
  const [i, setI] = useState(0);
  useEffect(() => { const id = window.setInterval(() => setI((n) => (n + 1) % SLIDES.length), 4200); return () => window.clearInterval(id); }, []);
  return <div className="ss-captions" aria-live="off">
    {SLIDES.map((s, k) => <div key={s.title} className={`ss-caption${k === i ? " is-on" : ""}${s.brand ? " is-brand" : ""}`} aria-hidden={k !== i}>
      <span className="ss-title">{s.title}</span>{s.sub && <span className="ss-sub">{s.sub}</span>}
    </div>)}
  </div>;
}

function useEnv(): Env {
  return useMemo(() => {
    if (typeof window === "undefined") return { compact: false, still: false };
    return { compact: window.matchMedia("(max-width: 760px)").matches || window.matchMedia("(pointer: coarse)").matches, still: window.matchMedia("(prefers-reduced-motion: reduce)").matches };
  }, []);
}

export default function ScreensaverScene() {
  const env = useEnv();
  const q = useAdaptiveDpr();
  return <div className="ss-scene">
    <Canvas flat frameloop={env.still ? "demand" : "always"} dpr={q.dpr} camera={{ fov: FOV, near: 0.1, far: 400, position: [0, 0, 30] }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#020609"]} />
      <fog attach="fog" args={["#020a0c", 40, 140]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[6, 5, 8]} intensity={60} color="#7dffb6" distance={40} />
      <pointLight position={[-8, -4, 6]} intensity={40} color="#4fd8ff" distance={40} />
      <Nebula {...env} />
      <Stars {...env} />
      <Halo {...env} />
      <EnergyRings {...env} />
      <Logo {...env} />
      <Orbits {...env} />
      {MOLECULES.slice(0, 5).map((m, i) => <Molecule key={i} m={m} compact={env.compact} />)}
      {!env.still && <Sparkles count={90} scale={[22, 13, 8]} size={2.2} speed={0.25} opacity={0.6} color="#8dffc4" />}
      <Rig {...env} />
      <QualityMonitor {...q} />
      <EffectComposer multisampling={COMPOSER_SAMPLES}>
        <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.8} luminanceSmoothing={0.15} />
        <Vignette offset={0.25} darkness={0.75} />
      </EffectComposer>
    </Canvas>
    <Captions />
  </div>;
}
