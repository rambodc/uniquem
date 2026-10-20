import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import shapesSvg from "./uniquem-mark-shapes.svg?raw";

// The Uniquem mark: 10 flat shapes traced (potrace) from the original logo PNG,
// in the PNG's own 1100 x 693 pixel space. Caps get raw pixel UVs, so a texture
// with repeat (1/W, 1/H) puts the original artwork on the front faces exactly.
export const MARK_IMG_W = 1100, MARK_IMG_H = 693;
export const MARK_TEXTURE_URL = "/images/test/uniquem-mark-texture.png";
const SCALE = 0.01; // px -> world units (mark is ~10.5 x 6.9 units)

export function buildMarkGeometry(depthPx: number, bevel = true) {
  const data = new SVGLoader().parse(shapesSvg);
  const geos: THREE.ExtrudeGeometry[] = [];
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) {
      // Flip SVG y-down into y-up pixel space so planar UVs are x/W, y/H.
      const { shape: pts, holes } = shape.extractPoints(24);
      const flip = (p: THREE.Vector2) => new THREE.Vector2(p.x, MARK_IMG_H - p.y);
      const s = new THREE.Shape(pts.map(flip));
      s.holes = holes.map((h) => new THREE.Path(h.map(flip)));
      const b = Math.min(2, depthPx * 0.2);
      geos.push(new THREE.ExtrudeGeometry(s, { depth: depthPx, curveSegments: 24, bevelEnabled: bevel, bevelThickness: b, bevelSize: Math.min(0.8, b * 0.4), bevelSegments: 2 }));
    }
  }
  const box = new THREE.Box3();
  geos.forEach((g) => { g.computeBoundingBox(); box.union(g.boundingBox!); });
  const c = box.getCenter(new THREE.Vector3());
  geos.forEach((g) => { g.translate(-c.x, -c.y, -c.z); g.scale(SCALE, SCALE, SCALE); g.computeVertexNormals(); });
  return { geos, size: box.getSize(new THREE.Vector3()).multiplyScalar(SCALE) };
}

export function loadMarkTexture() {
  const tex = new THREE.TextureLoader().load(MARK_TEXTURE_URL);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1 / MARK_IMG_W, 1 / MARK_IMG_H);
  tex.anisotropy = 8;
  return tex;
}
