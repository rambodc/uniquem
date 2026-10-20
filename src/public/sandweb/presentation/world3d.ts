import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Shared, non-React helpers for the v3 presentation scenes. Simulation state
// lives in plain objects mutated only through these functions.

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };
export const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));
export function seeded(seed: number) { let x = Math.max(1, Math.floor(seed) % 2147483647); return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }

// Quartz sand palette: tan, beige, buff, a few darker lithic grains.
export const SAND_PALETTE = ["#d9c4a0", "#cdb48d", "#e4d5ba", "#bfa37c", "#c8ae86", "#a98f6c", "#ddcaa8", "#8f7a5f"].map((c) => new THREE.Color(c));
export const OIL_HEAD = new THREE.Color("#c87a24"), OIL_TAIL = new THREE.Color("#1a0c04");
export const WEB_HEAD = new THREE.Color("#ffd23a"), WEB_TAIL = new THREE.Color("#2c2000");

function hashNoise(x: number, y: number, z: number, seed: number) {
  // Smooth-ish value noise from a few sines; good enough for grain lumps.
  return Math.sin(x * 1.7 + seed) * Math.cos(y * 2.3 + seed * 1.3) * 0.5 + Math.sin(z * 2.9 + x * 0.7 + seed * 2.1) * 0.35 + Math.sin((x + y + z) * 4.1 + seed) * 0.15;
}

/** Irregular, rounded sand-grain geometry (unit radius). */
export function makeGrainGeometry(seed: number, detail = 3) {
  const base = new THREE.IcosahedronGeometry(1, detail);
  base.deleteAttribute("normal"); base.deleteAttribute("uv");
  const geo = mergeVertices(base), pos = geo.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  // Sub-angular quartz: a few flat fracture facets plus lumpy noise.
  const rand = seeded(Math.floor(seed * 1000) + 7), facets = Array.from({ length: 6 }, () => ({ n: new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize(), d: 0.78 + rand() * 0.14 }));
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let r = 1 + 0.18 * hashNoise(v.x * 1.3, v.y * 1.3, v.z * 1.3, seed) + 0.05 * hashNoise(v.x * 4, v.y * 4, v.z * 4, seed * 3);
    for (const f of facets) { const c = v.dot(f.n); if (c > 0.05) r = Math.min(r, f.d / c); }
    pos.setXYZ(i, v.x * r, v.y * r * 0.9, v.z * r * 1.05);
    const shade = 0.86 + 0.14 * (0.5 + 0.5 * hashNoise(v.x * 9, v.y * 9, v.z * 9, seed * 5));
    colors.set([shade, shade * 0.99, shade * 0.97], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

/** Speckled rock texture for strata faces. */
export function rockTexture(base: string, seed: number, bedding = true) {
  const rand = seeded(seed);
  const texture = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) { const l = rand(); ctx.fillStyle = `rgba(${l > 0.5 ? 255 : 0},${l > 0.5 ? 245 : 0},${l > 0.5 ? 225 : 0},${0.04 + rand() * 0.1})`; const r = 0.5 + rand() * 1.8; ctx.fillRect(rand() * s, rand() * s, r, r); }
    if (bedding) for (let i = 0; i < 9; i++) { ctx.strokeStyle = `rgba(0,0,0,${0.05 + rand() * 0.08})`; ctx.lineWidth = 1 + rand() * 2; ctx.beginPath(); const y = rand() * s; ctx.moveTo(0, y); ctx.bezierCurveTo(s * 0.3, y + (rand() - 0.5) * 12, s * 0.7, y + (rand() - 0.5) * 12, s, y); ctx.stroke(); }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function ringTexture() {
  return canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.28, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.55, "rgba(255,255,255,0.55)"); g.addColorStop(0.7, "rgba(255,255,255,0.18)"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  });
}

export function glyphTexture(glyph: string) {
  return canvasTexture(64, (ctx, s) => { ctx.fillStyle = "#fff"; ctx.font = `bold ${s * 0.8}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(glyph, s / 2, s / 2 + 2); });
}

export function dotTexture() {
  return canvasTexture(64, (ctx, s) => { const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,0.6)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); });
}

// ── Pore-scale sand pack ─────────────────────────────────────────────────────
export type Pack = {
  count: number; centers: Float32Array; radii: Float32Array; variant: Uint8Array; color: THREE.Color[]; rot: THREE.Quaternion[]; stretch: THREE.Vector3[];
  mobile: Uint8Array; contacts: [number, number][]; cell: number; grid: Map<string, number[]>; bounds: { x: number; y: number; z: number };
};

export function buildPack(target: number, seed: number, bounds = { x: 12, y: 6.5, z: 3 }): Pack {
  const rand = seeded(seed), centers: number[] = [], radii: number[] = [];
  for (let tries = 0; radii.length < target && tries < target * 400; tries++) {
    const r = 0.45 + Math.pow(rand(), 1.6) * 0.85;
    const x = (rand() * 2 - 1) * bounds.x, y = (rand() * 2 - 1) * bounds.y, z = (rand() * 2 - 1) * bounds.z;
    let ok = true;
    for (let j = 0; j < radii.length && ok; j++) { const dx = x - centers[j * 3], dy = y - centers[j * 3 + 1], dz = z - centers[j * 3 + 2], m = (r + radii[j]) * 0.93; if (dx * dx + dy * dy + dz * dz < m * m) ok = false; }
    if (ok) { centers.push(x, y, z); radii.push(r); }
  }
  const count = radii.length, c = new Float32Array(centers), rr = new Float32Array(radii);
  const mobile = new Uint8Array(count), variant = new Uint8Array(count), color: THREE.Color[] = [], rot: THREE.Quaternion[] = [], stretch: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    mobile[i] = rr[i] < 0.62 && rand() < 0.55 ? 1 : 0; variant[i] = Math.floor(rand() * 3);
    color.push(SAND_PALETTE[Math.floor(rand() * SAND_PALETTE.length)].clone().offsetHSL(0, (rand() - 0.5) * 0.05, (rand() - 0.5) * 0.06));
    rot.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6.3, rand() * 6.3, rand() * 6.3)));
    stretch.push(new THREE.Vector3(0.88 + rand() * 0.24, 0.85 + rand() * 0.2, 0.9 + rand() * 0.22));
  }
  const contacts: [number, number][] = [];
  for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
    if (mobile[i] || mobile[j]) continue;
    const dx = c[i * 3] - c[j * 3], dy = c[i * 3 + 1] - c[j * 3 + 1], dz = c[i * 3 + 2] - c[j * 3 + 2], m = (rr[i] + rr[j]) * 1.12;
    if (dx * dx + dy * dy + dz * dz < m * m) contacts.push([i, j]);
  }
  contacts.sort((a, b) => Math.min(c[a[0] * 3], c[a[1] * 3]) - Math.min(c[b[0] * 3], c[b[1] * 3]));
  const cell = 2.6, grid = new Map<string, number[]>();
  for (let i = 0; i < count; i++) { if (mobile[i]) continue; const key = `${Math.floor(c[i * 3] / cell)},${Math.floor(c[i * 3 + 1] / cell)},${Math.floor(c[i * 3 + 2] / cell)}`; const list = grid.get(key); if (list) list.push(i); else grid.set(key, [i]); }
  return { count, centers: c, radii: rr, variant, color, rot, stretch, mobile, contacts, cell, grid, bounds };
}

/** Push a point out of any static grain it penetrates; returns true if it hit one. */
export function collide(pack: Pack, p: THREE.Vector3, v: THREE.Vector3, pad: number) {
  const { cell, grid, centers, radii } = pack, cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
  let hit = false;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let d = -1; d <= 1; d++) {
    const list = grid.get(`${cx + a},${cy + b},${cz + d}`); if (!list) continue;
    for (const i of list) {
      const dx = p.x - centers[i * 3], dy = p.y - centers[i * 3 + 1], dz = p.z - centers[i * 3 + 2], dist = Math.sqrt(dx * dx + dy * dy + dz * dz), min = radii[i] * 1.02 + pad;
      if (dist < min && dist > 1e-4) {
        const nx = dx / dist, ny = dy / dist, nz = dz / dist, push = min - dist;
        p.x += nx * push; p.y += ny * push; p.z += nz * push;
        const vn = v.x * nx + v.y * ny + v.z * nz; if (vn < 0) { v.x -= vn * nx; v.y -= vn * ny; v.z -= vn * nz; }
        hit = true;
      }
    }
  }
  return hit;
}

/** Flow toward the wellbore (+x): accelerates near it and converges on the perforation. */
export function flowVelocity(p: THREE.Vector3, out: THREE.Vector3, speed: number, bounds: Pack["bounds"]) {
  const near = smooth((p.x + bounds.x) / (2 * bounds.x));
  return out.set(speed * (0.6 + 2.2 * near * near), -p.y * 0.06 * near * speed, -p.z * 0.06 * near * speed);
}

// ── Tracers (oil / SandWeb streaks through the pores) ───────────────────────
export type Tracers = { count: number; pos: Float32Array; vel: Float32Array; line: Float32Array; colors: Float32Array; alive: Uint8Array; rand: () => number };

export function makeTracers(count: number, seed: number): Tracers {
  return { count, pos: new Float32Array(count * 3), vel: new Float32Array(count * 3), line: new Float32Array(count * 6), colors: new Float32Array(count * 6), alive: new Uint8Array(count), rand: seeded(seed) };
}

const tp = new THREE.Vector3(), tv = new THREE.Vector3(), tf = new THREE.Vector3();
export function respawnTracer(tr: Tracers, i: number, bounds: Pack["bounds"], anywhere: boolean) {
  const r = tr.rand;
  tr.pos.set([anywhere ? (r() * 2 - 1) * bounds.x : -bounds.x - r() * 2, (r() * 2 - 1) * bounds.y, (r() * 2 - 1) * bounds.z], i * 3);
  tr.vel.set([0, 0, 0], i * 3); tr.alive[i] = 1;
}

/** Advect tracers through the pack and write streak line segments. `limitX` hides tracers ahead of a front. */
export function stepTracers(tr: Tracers, pack: Pack, dt: number, speed: number, head: THREE.Color, tail: THREE.Color, limitX = Infinity, streak = 0.35) {
  const step = Math.min(dt, 1 / 30);
  for (let i = 0; i < tr.count; i++) {
    if (!tr.alive[i]) respawnTracer(tr, i, pack.bounds, true);
    tp.fromArray(tr.pos, i * 3); tv.fromArray(tr.vel, i * 3);
    flowVelocity(tp, tf, speed, pack.bounds);
    tv.lerp(tf, 0.18); tp.addScaledVector(tv, step);
    collide(pack, tp, tv, 0.06);
    if (tp.x > pack.bounds.x + 1.5 || Math.abs(tp.y) > pack.bounds.y + 2 || Math.abs(tp.z) > pack.bounds.z + 2) { respawnTracer(tr, i, pack.bounds, false); tp.fromArray(tr.pos, i * 3); tv.set(0, 0, 0); }
    tr.pos.set([tp.x, tp.y, tp.z], i * 3); tr.vel.set([tv.x, tv.y, tv.z], i * 3);
    const hidden = tp.x > limitX, len = streak / Math.max(0.5, speed);
    if (hidden) { tr.line.set([0, -999, 0, 0, -999, 0], i * 6); continue; }
    tr.line.set([tp.x, tp.y, tp.z, tp.x - tv.x * len, tp.y - tv.y * len, tp.z - tv.z * len], i * 6);
    tr.colors.set([head.r, head.g, head.b, tail.r, tail.g, tail.b], i * 6);
  }
}
