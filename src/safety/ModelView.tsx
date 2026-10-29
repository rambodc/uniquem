// Loaded only when a 3D slide is shown (React.lazy), so three.js never weighs down the rest of the app.
import { Component, Suspense, type ReactNode } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="sf-media-note" role="alert">The 3D model could not be loaded. Check your connection and try again.</div> : this.props.children; }
}
function Model({ url }: { url: string }) { const gltf = useLoader(GLTFLoader, url); return <primitive object={gltf.scene} />; }

/** A GLB model the person can drag to turn and pinch or scroll to zoom. It turns slowly on its own until touched. */
export default function ModelView({ url, label }: { url: string; label: string }) {
  return <Fallback>
    <Canvas className="sf-canvas" camera={{ position: [1.6, 1.1, 1.9], fov: 38 }} dpr={[1, 2]} aria-label={label} role="img">
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 5, 2]} intensity={2.2} />
      <directionalLight position={[-3, 2, -2]} intensity={0.7} color="#bdf3e1" />
      <Suspense fallback={null}><Bounds fit clip observe margin={1.25}><Model url={url} /></Bounds></Suspense>
      <OrbitControls makeDefault autoRotate autoRotateSpeed={1.2} enablePan={false} minDistance={0.8} maxDistance={6} />
    </Canvas>
  </Fallback>;
}
