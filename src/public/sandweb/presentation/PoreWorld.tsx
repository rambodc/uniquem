import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildPack, clamp01, collide, dotTexture, flowVelocity, glyphTexture, makeGrainGeometry, makeTracers, OIL_HEAD, OIL_TAIL, ramp, ringTexture, seeded, smooth, stepTracers, WEB_HEAD, WEB_TAIL } from "./world3d";

export type Mode = "sand" | "treat" | "clean";
type Props = { mode: Mode; progress: { current: number }; compact: boolean };

const GOLD = new THREE.Color("#2dff7a"), REPEL = new THREE.Color("#ff6a4a"), FINES = new THREE.Color("#6d6152");
const up = new THREE.Vector3(0, 1, 0);

// Pore-scale macro view: real-looking quartz grains, fines on grain surfaces,
// oil streaming through the pore throats toward the perforation on the right.
export default function PoreWorld({ mode, progress, compact }: Props) {
  const pack = useMemo(() => buildPack(compact ? 130 : 210, 7), [compact]);
  const geos = useMemo(() => [makeGrainGeometry(1.3), makeGrainGeometry(4.1), makeGrainGeometry(7.7)], []);
  const ids = useMemo(() => [0, 1, 2].map((v) => Array.from({ length: pack.count }, (_, i) => i).filter((i) => pack.variant[i] === v)), [pack]);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);
  const halo = useRef<THREE.InstancedMesh>(null), minus = useRef<THREE.InstancedMesh>(null), fines = useRef<THREE.InstancedMesh>(null);
  const drops = useRef<THREE.Points>(null), oil = useRef<THREE.LineSegments>(null), web = useRef<THREE.LineSegments>(null), contactGlow = useRef<THREE.Points>(null);
  const textures = useMemo(() => ({ ring: ringTexture(), minus: glyphTexture("−"), dot: dotTexture() }), []);
  const tracers = useMemo(() => makeTracers(compact ? 260 : 620, 3), [compact]);

  const sim = useMemo(() => {
    const rand = seeded(19), fineCount = compact ? 120 : 260;
    const fine = Array.from({ length: fineCount }, () => {
      let g = Math.floor(rand() * pack.count); while (pack.mobile[g]) g = Math.floor(rand() * pack.count);
      const dir = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize();
      const home = new THREE.Vector3().fromArray(pack.centers, g * 3).addScaledVector(dir, pack.radii[g] * 1.01);
      return { home, dir, pos: home.clone(), vel: new THREE.Vector3(), detach: 0.05 + rand() * 0.75, plug: rand() < 0.45, plugAt: new THREE.Vector3(9.8 + rand() * 1.4, (rand() - 0.5) * 2.2, (rand() - 0.5) * 2.2), q: new THREE.Quaternion().setFromUnitVectors(up, dir), size: 0.08 + rand() * 0.1 };
    });
    const movers = Array.from({ length: pack.count }, (_, i) => ({ i, start: rand() * 0.75, pos: new THREE.Vector3().fromArray(pack.centers, i * 3), vel: new THREE.Vector3() }));
    const contactPos = new Float32Array(pack.contacts.length * 3), webPos = new Float32Array(pack.contacts.length * 6);
    pack.contacts.forEach(([a, b], k) => {
      const pa = new THREE.Vector3().fromArray(pack.centers, a * 3), pb = new THREE.Vector3().fromArray(pack.centers, b * 3);
      contactPos.set(pa.clone().lerp(pb, pack.radii[a] / (pack.radii[a] + pack.radii[b])).toArray(), k * 3);
      webPos.set([...pa.toArray(), ...pb.toArray()], k * 6);
    });
    return { fine, movers, contactPos, webPos, last: 0, m: new THREE.Matrix4(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), v: new THREE.Vector3() };
  }, [pack, compact]);

  useLayoutEffect(() => {
    ids.forEach((list, v) => { const mesh = meshes.current[v]; if (!mesh) return; list.forEach((i, k) => { mesh.setColorAt(k, pack.color[i]); }); if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; });
    const f = fines.current; if (f) { sim.fine.forEach((_, k) => f.setColorAt(k, FINES)); if (f.instanceColor) f.instanceColor.needsUpdate = true; }
  }, [ids, pack, sim]);

  useFrame(({ camera, clock }, delta) => {
    const p = progress.current, t = clock.elapsedTime, dt = Math.min(delta, 1 / 30);
    const front = mode === "treat" ? -pack.bounds.x - 2 + p * 1.45 * (2 * pack.bounds.x + 4) : Infinity;
    const treated = (x: number) => (mode === "clean" ? 1 : mode === "treat" ? clamp01((front - x) / 5) : 0);
    const { m, s, v } = sim;
    // Grains (mobile ones migrate with the flow in the "sand" mode).
    ids.forEach((list, vIdx) => {
      const mesh = meshes.current[vIdx]; if (!mesh) return;
      list.forEach((i, k) => {
        const mv = sim.movers[i];
        if (mode === "sand" && pack.mobile[i] && p > mv.start) {
          flowVelocity(mv.pos, v, 1.2 + 3 * smooth((p - mv.start) * 2), pack.bounds);
          mv.vel.lerp(v, 0.08); mv.pos.addScaledVector(mv.vel, dt); collide(pack, mv.pos, mv.vel, pack.radii[i] * 0.8);
        } else if (mode !== "sand" || p <= mv.start) mv.pos.fromArray(pack.centers, i * 3);
        const pull = mode === "sand" ? 0 : 0.05 * treated(mv.pos.x);
        const gone = mv.pos.x > pack.bounds.x + 2 ? 0 : 1;
        sim.p.copy(mv.pos).multiplyScalar(1 - pull);
        s.copy(pack.stretch[i]).multiplyScalar(pack.radii[i] * gone);
        mesh.setMatrixAt(k, m.compose(sim.p, pack.rot[i], s));
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
    // Fines: attached → detach and migrate (sand) / snap back on (treat) / stay (clean).
    const f = fines.current;
    if (f) {
      sim.fine.forEach((fn, k) => {
        if (mode === "sand") {
          if (p > fn.detach) {
            if (fn.plug && fn.pos.x > 9.4) fn.pos.lerp(fn.plugAt, 0.06);
            else { flowVelocity(fn.pos, v, 2 + 4 * (p - fn.detach), pack.bounds); fn.vel.lerp(v, 0.12); fn.pos.addScaledVector(fn.vel, dt); collide(pack, fn.pos, fn.vel, 0.05); }
          } else fn.pos.copy(fn.home);
        } else if (mode === "treat") {
          const loose = sim.p.copy(fn.home).addScaledVector(fn.dir, 0.45 + 0.15 * Math.sin(t * 3 + k));
          fn.pos.copy(loose).lerp(fn.home, smooth(treated(fn.home.x) * 1.4));
        } else fn.pos.copy(fn.home);
        s.set(fn.size * 1.6, fn.size * 0.35, fn.size);
        f.setMatrixAt(k, m.compose(fn.pos, fn.q, s));
      });
      f.instanceMatrix.needsUpdate = true;
    }
    // Charge halos (billboards): repel = red pulsing outward, treated = tight gold.
    const h = halo.current, mi = minus.current;
    if (h && mi) {
      const base = mode === "sand" ? 0.16 : mode === "treat" ? 0.16 : 0.07;
      let n = 0;
      for (let i = 0; i < pack.count; i++) {
        const mv = sim.movers[i], tr = treated(mv.pos.x), pulse = mode === "sand" || tr < 1 ? 1.16 + 0.08 * Math.sin(t * 2.4 + i) : 1.05;
        const shown = i % 5 < 2 ? 1 : 0;
        const scale = pack.radii[i] * 2 * THREE.MathUtils.lerp(pulse, 1.04, tr) * (mv.pos.x > pack.bounds.x + 2 ? 0 : shown);
        h.setMatrixAt(i, m.compose(mv.pos, camera.quaternion, s.setScalar(scale)));
        h.setColorAt(i, sim.c.copy(REPEL).lerp(GOLD, tr).multiplyScalar(base * 3));
        if (i % 3 === 0) { sim.p.copy(camera.position).sub(mv.pos).normalize().multiplyScalar(pack.radii[i] * 1.05).add(mv.pos); mi.setMatrixAt(n, m.compose(sim.p, camera.quaternion, s.setScalar(0.34 * (i % 5 < 2 ? 1 : 0) * (1 - tr) * (mv.pos.x > pack.bounds.x + 2 ? 0 : 1)))); n++; }
      }
      h.instanceMatrix.needsUpdate = true; if (h.instanceColor) h.instanceColor.needsUpdate = true; mi.instanceMatrix.needsUpdate = true;
      (mi.material as THREE.MeshBasicMaterial).setValues({ opacity: mode === "clean" ? 0 : 0.55 });
    }
    // Oil (or SandWeb) streaks through the open pore space.
    const lines = oil.current;
    if (lines) {
      const speed = mode === "clean" ? 3.4 : mode === "treat" ? 1.6 : 1.4;
      if (mode === "treat") stepTracers(tracers, pack, dt, speed, WEB_HEAD, WEB_TAIL, front, 0.9);
      else stepTracers(tracers, pack, dt, speed, OIL_HEAD, OIL_TAIL, Infinity, mode === "clean" ? 1.1 : 0.8);
      lines.geometry.attributes.position.needsUpdate = true; lines.geometry.attributes.color.needsUpdate = true;
      const dp = drops.current; if (dp) { dp.geometry.attributes.position.needsUpdate = true; dp.geometry.attributes.color.needsUpdate = true; }
    }
    // Contact web.
    const webAmount = mode === "clean" ? 1 : mode === "treat" ? clamp01(p * 1.45 - 0.15) : 0;
    web.current?.geometry.setDrawRange(0, Math.floor(webAmount * pack.contacts.length) * 2);
    contactGlow.current?.geometry.setDrawRange(0, Math.floor(webAmount * pack.contacts.length));
    // Camera.
    const k = smooth(p);
    if (mode === "sand") { camera.position.set(-5 + 11 * k, 2.5 - 1 * k, 19 - 6 * k); camera.lookAt(1 + 6 * k, 0, 0); }
    else if (mode === "treat") { const a = -0.55 + 1.1 * k, r = 19 - 3 * k; camera.position.set(Math.sin(a) * r, 2.5 + Math.sin(t * 0.3), Math.cos(a) * r); camera.lookAt(0, 0, 0); }
    else { camera.position.set(4 - 4 * k, 1 + 2 * k, 12 + 9 * k); camera.lookAt(3 - 2 * k, 0, 0); }
  });

  const fineCount = sim.fine.length, minusCount = Math.ceil(pack.count / 3);
  return <group>
    <color attach="background" args={["#0a0806"]} />
    <fog attach="fog" args={["#0a0806", 12, 34]} />
    <hemisphereLight args={["#fff1dc", "#2a1c10", 0.6]} />
    <directionalLight position={[-8, 12, 10]} intensity={2.4} color="#fff0d8" />
    <directionalLight position={[10, -4, -10]} intensity={0.9} color="#8fb0d8" />
    <pointLight position={[13, 0, 2]} color={mode === "treat" ? "#3dff7a" : "#ffb070"} intensity={30} distance={22} />
    {geos.map((geo, v) => <instancedMesh key={v} ref={(mesh) => { meshes.current[v] = mesh; }} args={[geo, undefined, ids[v].length]} frustumCulled={false}><meshStandardMaterial color="#ffffff" vertexColors roughness={0.86} metalness={0.02} /></instancedMesh>)}
    <instancedMesh ref={fines} args={[undefined, undefined, fineCount]} frustumCulled={false}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#ffffff" roughness={1} /></instancedMesh>
    <instancedMesh ref={halo} args={[undefined, undefined, pack.count]} frustumCulled={false}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={textures.ring} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></instancedMesh>
    <instancedMesh ref={minus} args={[undefined, undefined, minusCount]} frustumCulled={false}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={textures.minus} color="#ff8a6a" transparent depthWrite={false} toneMapped={false} /></instancedMesh>
    <lineSegments ref={oil} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[tracers.line, 3]} /><bufferAttribute attach="attributes-color" args={[tracers.colors, 3]} /></bufferGeometry><lineBasicMaterial vertexColors transparent opacity={0.9} toneMapped={false} /></lineSegments>
    <points ref={drops} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[tracers.line, 3]} /><bufferAttribute attach="attributes-color" args={[tracers.colors, 3]} /></bufferGeometry><pointsMaterial map={textures.dot} vertexColors size={compact ? 0.2 : 0.16} transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
    <lineSegments ref={web} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[sim.webPos, 3]} /></bufferGeometry><lineBasicMaterial color="#5dffa0" transparent opacity={0.3} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} /></lineSegments>
    <points ref={contactGlow} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[sim.contactPos, 3]} /></bufferGeometry><pointsMaterial map={textures.dot} color="#7dffb4" size={0.32} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></points>
    {/* Casing wall with a perforation tunnel the fluid converges on. */}
    <mesh position={[14.2, 0, 0]}><boxGeometry args={[1, 18, 14]} /><meshStandardMaterial color="#6f7b84" metalness={0.85} roughness={0.38} /></mesh>
    <mesh position={[13.68, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><circleGeometry args={[1.7, 40]} /><meshBasicMaterial color="#050403" /></mesh>
    <mesh position={[13.66, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><ringGeometry args={[1.7, 2.05, 40]} /><meshStandardMaterial color="#9aa6ae" metalness={0.9} roughness={0.25} /></mesh>
  </group>;
}
