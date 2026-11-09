import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type FrameCallback = (dt: number) => boolean;

/** Renderer + camera + controls with render-on-demand. */
export class SceneHost {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  private frameCbs = new Set<FrameCallback>();
  private raf = 0;
  private last = 0;
  private ro: ResizeObserver | null = null;
  private disposed = false;

  constructor(readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    container.appendChild(canvas);

    this.scene.background = new THREE.Color('#e8ecf1');
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f99', 1.6));
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(2.5, 4, 3.5);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight('#cfe0ff', 0.8);
    fill.position.set(-3, 2, 2);
    this.scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 48),
      new THREE.MeshStandardMaterial({ color: '#d5dae1', roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001;
    this.scene.add(floor);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
    this.camera.position.set(0, 1.1, 4);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 7;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(55);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(100);
    this.controls.minAzimuthAngle = THREE.MathUtils.degToRad(-60);
    this.controls.maxAzimuthAngle = THREE.MathUtils.degToRad(60);
    this.controls.addEventListener('change', () => this.requestRender());

    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(container);
    }
    this.resize();
  }

  resize(): void {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.requestRender();
  }

  requestRender(): void {
    if (this.disposed || this.raf) return;
    this.raf = requestAnimationFrame(this.tick);
  }

  /** Register a per-frame callback; return true from it to keep animating. */
  onFrame(cb: FrameCallback): () => void {
    this.frameCbs.add(cb);
    this.requestRender();
    return () => this.frameCbs.delete(cb);
  }

  private tick = (t: number) => {
    this.raf = 0;
    if (this.disposed) return;
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 1 / 60;
    this.last = t;
    const moving = this.controls.update();
    for (const cb of [...this.frameCbs]) if (!cb(dt)) this.frameCbs.delete(cb);
    this.renderer.render(this.scene, this.camera);
    if (moving || this.frameCbs.size) this.requestRender();
    else this.last = 0;
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.controls.dispose();
    this.frameCbs.clear();
    this.scene.traverse((o) => disposeObject(o));
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

export function disposeObject(o: THREE.Object3D): void {
  const m = o as THREE.Mesh;
  if (m.geometry) m.geometry.dispose();
  const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
  for (const mat of mats) {
    for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
    mat.dispose();
  }
}
