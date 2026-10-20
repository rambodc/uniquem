import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { dotTexture, makeGrainGeometry, seeded, smooth } from "./world3d";

type Props = { progress: { current: number }; compact: boolean };
const TRAIL = 9;
const OIL = [new THREE.Color("#ffb347"), new THREE.Color("#ff7a1a"), new THREE.Color("#e2541a")];
const GAS = [new THREE.Color("#b8fbff"), new THREE.Color("#36d6ff"), new THREE.Color("#2affc6")];

// Near-wellbore production after treatment: oil and gas streamlines speed
// through open pore channels of a stable sand pack and converge on a
// perforation tunnel into the casing. No loose sand moves.
export default function FlowWorld({ progress, compact }: Props) {
  const count = compact ? 420 : 900;
  const data = useMemo(() => {
    const r = seeded(23), lines = new Float32Array(count * TRAIL * 6), colors = new Float32Array(count * TRAIL * 6), heads = new Float32Array(count * 3), headCol = new Float32Array(count * 3);
    const ps = Array.from({ length: count }, () => {
      const gas = r() < 0.38, pal = gas ? GAS : OIL, c = pal[Math.floor(r() * pal.length)].clone().offsetHSL(0, 0, (r() - 0.5) * 0.08);
      return { s: r(), r0: 1.4 + Math.pow(r(), 0.7) * 8.5, th: r() * Math.PI * 2, swirl: (r() - 0.5) * 1.6, wob: r() * 6.28, speed: (gas ? 1.35 : 1) * (0.75 + r() * 0.5), c, gas };
    });
    const sv = new Float32Array(ps.map((x) => x.s));
    return { lines, colors, heads, headCol, ps, sv, v: new THREE.Vector3() };
  }, [count]);
  const lineRef = useRef<THREE.LineSegments>(null), headRef = useRef<THREE.Points>(null), dot = useMemo(() => dotTexture(), []);
  const grains = useRef<THREE.InstancedMesh>(null), geo = useMemo(() => makeGrainGeometry(3.3, 2), []);
  const shell = useMemo(() => {
    const r = seeded(41), n = compact ? 160 : 320, out: { p: THREE.Vector3; s: number; q: THREE.Quaternion; c: THREE.Color }[] = [];
    const pal = ["#cdb48a", "#b89b70", "#d9c39c", "#a88b62", "#c8ab7e"];
    for (let i = 0; i < n; i++) { const x = -44 + r() * 46, a = r() * Math.PI * 2, rad = 15 + r() * 5 - Math.max(0, x + 8) * 0.3; out.push({ p: new THREE.Vector3(x, Math.cos(a) * rad, Math.sin(a) * rad), s: 1 + r() * 1.6, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 6, r() * 6, r() * 6)), c: new THREE.Color(pal[Math.floor(r() * pal.length)]) }); }
    return out;
  }, [compact]);
  useLayoutEffect(() => {
    const m = grains.current; if (!m) return; const mt = new THREE.Matrix4(), sc = new THREE.Vector3();
    shell.forEach((g, i) => { m.setMatrixAt(i, mt.compose(g.p, g.q, sc.setScalar(g.s))); m.setColorAt(i, g.c); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [shell]);

  // Streamline position at path parameter s (0 = far formation, 1 = inside the perforation).
  const at = (p: (typeof data.ps)[number], s: number, t: number, out: THREE.Vector3) => {
    const conv = Math.pow(1 - s, 1.25), rad = p.r0 * conv + 0.35 * (1 - conv), th = p.th + p.swirl * s + 0.25 * Math.sin(t * 0.8 + p.wob) * (1 - s);
    return out.set(-42 + 44 * s, Math.cos(th) * rad, Math.sin(th) * rad);
  };

  useFrame(({ camera, clock }, delta) => {
    const t = clock.elapsedTime, dt = Math.min(delta, 1 / 30), p = progress.current, v = data.v;
    const boost = 1 + 0.6 * smooth(p);
    data.ps.forEach((pt, i) => {
      const prev = data.sv[i], next = prev + dt * 0.11 * pt.speed * boost * (0.45 + 2.6 * prev * prev), cur = next > 1 ? next - 1 : next;
      data.sv.set([cur], i);
      at(pt, cur, t, v); data.heads.set([v.x, v.y, v.z], i * 3); data.headCol.set([pt.c.r, pt.c.g, pt.c.b], i * 3);
      const len = 0.016 * (1 + 3 * cur * cur) * pt.speed;
      for (let k = 0; k < TRAIL; k++) {
        const s0 = Math.max(0, cur - k * len), s1 = Math.max(0, cur - (k + 1) * len), o = (i * TRAIL + k) * 6, f0 = 1 - k / TRAIL, f1 = 1 - (k + 1) / TRAIL;
        at(pt, s0, t, v); data.lines.set([v.x, v.y, v.z], o); at(pt, s1, t, v); data.lines.set([v.x, v.y, v.z], o + 3);
        data.colors.set([pt.c.r * f0, pt.c.g * f0, pt.c.b * f0, pt.c.r * f1, pt.c.g * f1, pt.c.b * f1], o);
      }
    });
    const l = lineRef.current; if (l) { l.geometry.attributes.position.needsUpdate = true; l.geometry.attributes.color.needsUpdate = true; }
    const h = headRef.current; if (h) { h.geometry.attributes.position.needsUpdate = true; h.geometry.attributes.color.needsUpdate = true; }
    // Camera glides along the flow toward the perforation, with a gentle orbit.
    const k = smooth(p), a = 0.55 - 1.0 * k, rr = compact ? 12.5 : 11;
    camera.position.set(-40 + 22 * k, Math.sin(a) * rr * 0.45, Math.cos(a) * rr);
    camera.lookAt(-20 + 22 * k, 0, 0);
  });

  return <group>
    <color attach="background" args={["#05100c"]} />
    <fog attach="fog" args={["#05100c", 18, 70]} />
    <hemisphereLight args={["#e9fff2", "#2a1c10", 0.7]} />
    <directionalLight position={[-10, 14, 12]} intensity={2} color="#fff0d8" />
    <pointLight position={[2, 0, 0]} color="#36e0d0" intensity={60} distance={30} />
    <instancedMesh ref={grains} args={[geo, undefined, shell.length]}><meshStandardMaterial color="#ffffff" roughness={0.88} /></instancedMesh>
    <lineSegments ref={lineRef} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.lines, 3]} /><bufferAttribute attach="attributes-color" args={[data.colors, 3]} /></bufferGeometry><lineBasicMaterial vertexColors transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></lineSegments>
    <points ref={headRef} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[data.heads, 3]} /><bufferAttribute attach="attributes-color" args={[data.headCol, 3]} /></bufferGeometry><pointsMaterial map={dot} vertexColors size={compact ? 0.42 : 0.34} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
    {/* Perforation tunnel and casing wall */}
    <mesh position={[3.2, 0, 0]} rotation={[0, Math.PI / 2, 0]}><ringGeometry args={[1.2, 4.2, 48]} /><meshStandardMaterial color="#3f4a50" metalness={0.8} roughness={0.45} side={THREE.DoubleSide} /></mesh>
    <mesh position={[3.15, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[1.25, 0.12, 12, 48]} /><meshStandardMaterial color="#b9c4ca" metalness={0.9} roughness={0.2} /></mesh>
    <mesh position={[3.3, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><circleGeometry args={[1.2, 40]} /><meshBasicMaterial color="#0f2f28" /></mesh>
  </group>;
}
