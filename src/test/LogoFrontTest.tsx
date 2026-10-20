import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import shapesSvg from "./uniquem-mark-shapes.svg?raw";

// Test-only page (/test/logo-3d-front, noindex, not in the sitemap): the Uniquem mark
// as a straight extrusion of the 10 flat shapes traced (potrace) from the
// original PNG. Front faces carry the original artwork as a planar texture, so
// the front view matches the PNG; sides use a slightly darker matching green.
const IMG_W = 1100, IMG_H = 693; // source PNG size; the SVG is in the same pixel space
const DEPTH = 100; // ~10% of the mark's ~1000 px width
const SCALE = 0.01; // px -> world units

function useMarkGeometry() {
  return useMemo(() => {
    const data = new SVGLoader().parse(shapesSvg);
    const geos: THREE.ExtrudeGeometry[] = [];
    for (const path of data.paths) {
      for (const shape of SVGLoader.createShapes(path)) {
        // Flip SVG y-down into y-up pixel space (0..IMG_H) so planar UVs = x/W, y/H.
        const { shape: pts, holes } = shape.extractPoints(24);
        const flip = (p: THREE.Vector2) => new THREE.Vector2(p.x, IMG_H - p.y);
        const s = new THREE.Shape(pts.map(flip));
        s.holes = holes.map((h) => new THREE.Path(h.map(flip)));
        geos.push(new THREE.ExtrudeGeometry(s, { depth: DEPTH, curveSegments: 24, bevelEnabled: true, bevelThickness: 2, bevelSize: 0.8, bevelSegments: 2 }));
      }
    }
    const box = new THREE.Box3();
    geos.forEach((g) => { g.computeBoundingBox(); box.union(g.boundingBox!); });
    const c = box.getCenter(new THREE.Vector3());
    geos.forEach((g) => { g.translate(-c.x, -c.y, -c.z); g.scale(SCALE, SCALE, SCALE); g.computeVertexNormals(); });
    const size = box.getSize(new THREE.Vector3()).multiplyScalar(SCALE);
    // Texture repeat/offset turn the raw pixel UVs of the caps into 0..1.
    return { geos, size };
  }, []);
}

function Mark() {
  const { geos, size } = useMarkGeometry();
  const group = useRef<THREE.Group>(null);
  const [front, side] = useMemo(() => {
    const tex = new THREE.TextureLoader().load("/images/test/uniquem-mark-texture.png");
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(1 / IMG_W, 1 / IMG_H);
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    // Unlit front: the PNG's own gradients and shading, colour for colour
    // (flat canvas = no tone mapping). The lit sides give the 3D depth.
    const f = new THREE.MeshBasicMaterial({ map: tex });
    const s = new THREE.MeshStandardMaterial({ color: "#0b8f22", roughness: 0.45, metalness: 0.05 });
    return [f, s];
  }, []);
  // Optional ?angle=<deg> freezes the turn (used for review screenshots); default is a slow ±30° sway.
  const fixed = useMemo(() => { if (typeof window === "undefined") return null; const v = new URLSearchParams(window.location.search).get("angle"); return v === null || Number.isNaN(Number(v)) ? null : THREE.MathUtils.degToRad(Number(v)); }, []);
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = fixed ?? 0.52 * Math.sin(clock.elapsedTime * 0.45); });
  return <>
    <group ref={group}>{geos.map((g, i) => <mesh key={i} geometry={g} material={[front, side]} castShadow />)}</group>
    <ContactShadows position={[0, -size.y / 2 - 0.9, 0]} scale={size.x * 1.6} blur={2.8} opacity={0.32} far={4} />
    <Fit w={size.x} h={size.y} />
  </>;
}

/** Orthographic camera (no perspective) so the front view is the PNG exactly,
 * with the whole mark centred and fully visible on any screen size. */
function Fit({ w, h }: { w: number; h: number }) {
  const size = useThree((s) => s.size), get = useThree((s) => s.get);
  useLayoutEffect(() => {
    const cam = get().camera as THREE.OrthographicCamera, fill = size.width < size.height ? 0.86 : 0.62;
    cam.zoom = Math.min((size.width * fill) / w, (size.height * fill) / h);
    cam.position.set(0, 0, 50); cam.near = 0.1; cam.far = 200; cam.updateProjectionMatrix(); cam.lookAt(0, 0, 0);
  }, [get, size, w, h]);
  return null;
}

export default function LogoFrontTest() {
  return <div style={{ position: "fixed", inset: 0, background: "radial-gradient(circle at 50% 42%, #ffffff 0%, #f1f3f2 52%, #dfe3e1 100%)" }}>
    <Canvas flat orthographic dpr={[1, 2]} camera={{ position: [0, 0, 50], zoom: 60 }} gl={{ antialias: true, alpha: true }} style={{ touchAction: "none" }}>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#cfd8d2", 0.5]} />
      <directionalLight position={[4, 6, 10]} intensity={1.1} />
      <directionalLight position={[-8, 2, 4]} intensity={0.45} />
      <directionalLight position={[0, -4, -8]} intensity={0.3} />
      <Suspense fallback={null}><Mark /></Suspense>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI * 0.3} maxPolarAngle={Math.PI * 0.7} />
    </Canvas>
  </div>;
}
