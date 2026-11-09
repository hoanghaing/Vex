import * as THREE from 'three';
import type { MachineModel } from '../model/types';
import { SHELF_H, SHELF_T, SLOT_DEPTH, SLOT_W, parseCode, slotItemPosition } from '../model/grid';
import { buildBody, type Body } from './body';
import { itemObject, releaseItemCache, retainItemCache } from './items';
import { type SceneHost, disposeObject } from './scene';

export interface CameraPose { position: THREE.Vector3; target: THREE.Vector3 }

/** Syncs a MachineModel into the scene. */
export class MachineView {
  body: Body | null = null;
  private model: MachineModel | null = null;
  private bodySig = '';
  private items = new Map<string, THREE.Object3D[]>();
  private itemsGroup = new THREE.Group();
  readonly trayGroup = new THREE.Group();
  private hoverBox: THREE.LineSegments;
  private selectBox: THREE.LineSegments;
  /** Hook to animate camera moves; default is instant. */
  moveCamera: (pose: CameraPose) => Promise<void> = async (pose) => {
    this.host.camera.position.copy(pose.position);
    this.host.controls.target.copy(pose.target);
    this.host.controls.update();
    this.host.requestRender();
  };

  constructor(readonly host: SceneHost) {
    retainItemCache();
    this.itemsGroup.name = 'vm3d-items';
    host.scene.add(this.itemsGroup, this.trayGroup);
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(SLOT_W * 0.98, SHELF_H - SHELF_T - 0.004, SLOT_DEPTH));
    this.hoverBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#4da3ff', transparent: true, opacity: 0.7 }));
    this.selectBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: '#ffb300' }));
    this.hoverBox.visible = this.selectBox.visible = false;
    host.scene.add(this.hoverBox, this.selectBox);
  }

  setModel(m: MachineModel): void {
    const sig = JSON.stringify([m.rows, m.cols, m.capacity, m.theme, m.name]);
    const first = !this.body;
    if (sig !== this.bodySig) {
      if (this.body) {
        this.host.scene.remove(this.body.group);
        this.body.group.traverse(disposeObject);
      }
      this.body = buildBody(m);
      this.host.scene.add(this.body.group);
      this.bodySig = sig;
    }
    this.model = m;
    this.syncItems();
    if (first) void this.overview(true);
    this.host.requestRender();
  }

  private syncItems(): void {
    const m = this.model!;
    this.itemsGroup.clear();
    this.items.clear();
    for (const s of Object.values(m.slots)) {
      const rc = parseCode(s.code, m.rows, m.cols);
      const t = m.itemTypes.find((x) => x.id === s.itemType);
      if (!rc || !t) continue;
      const list: THREE.Object3D[] = [];
      for (let i = 0; i < s.stock; i++) {
        const o = itemObject(t);
        const p = slotItemPosition(m, rc.row, rc.col, i);
        o.position.set(p.x, p.y, p.z);
        o.userData.code = s.code;
        this.itemsGroup.add(o);
        list.push(o);
      }
      this.items.set(s.code, list);
    }
  }

  addToTray(o: THREE.Object3D): void {
    this.trayGroup.attach(o);
    // keep at most 6 items in the tray
    while (this.trayGroup.children.length > 6) this.trayGroup.children[0].removeFromParent();
    this.host.requestRender();
  }

  clearTray(): void {
    this.trayGroup.clear();
    this.host.requestRender();
  }

  itemsOf(code: string): THREE.Object3D[] {
    return this.items.get(code) ?? [];
  }

  /** Detach the front item of a slot from bookkeeping (used by dispense animation). */
  takeFront(code: string): THREE.Object3D | null {
    const list = this.items.get(code);
    if (!list || !list.length) return null;
    return list.shift()!;
  }

  highlight(code: string | null, kind: 'hover' | 'select'): void {
    const box = kind === 'hover' ? this.hoverBox : this.selectBox;
    if (!code || !this.body) box.visible = false;
    else {
      box.position.copy(this.body.slotCenter(code));
      box.visible = true;
    }
    this.host.requestRender();
  }

  slotScreenPos(code: string): { x: number; y: number } | null {
    if (!this.body) return null;
    const p = this.body.slotCenter(code).clone();
    p.x += SLOT_W / 2;
    p.z = SLOT_DEPTH / 2;
    p.project(this.host.camera);
    const el = this.host.renderer.domElement;
    return { x: ((p.x + 1) / 2) * el.clientWidth, y: ((1 - p.y) / 2) * el.clientHeight };
  }

  overviewPose(): CameraPose {
    const d = this.body!.dims;
    const cx = (d.left + d.right) / 2;
    const fov = THREE.MathUtils.degToRad(this.host.camera.fov);
    const aspect = this.host.camera.aspect || 1;
    const distH = (d.H * 1.3) / 2 / Math.tan(fov / 2);
    const distW = ((d.right - d.left) * 1.25) / 2 / Math.tan(fov / 2) / aspect;
    const dist = Math.max(distH, distW);
    return { position: new THREE.Vector3(cx + dist * 0.12, d.H * 0.55, dist), target: new THREE.Vector3(cx, d.H * 0.5, 0) };
  }

  focusPose(code: string): CameraPose {
    const c = this.body!.slotCenter(code);
    return { position: new THREE.Vector3(c.x + 0.08, c.y + 0.08, 0.95), target: c };
  }

  focusSlot(code: string | null): Promise<void> {
    if (!this.body) return Promise.resolve();
    return code ? this.moveCamera(this.focusPose(code)) : this.overview();
  }

  overview(_instant = false): Promise<void> {
    if (!this.body) return Promise.resolve();
    const pose = this.overviewPose();
    if (_instant) {
      this.host.camera.position.copy(pose.position);
      this.host.controls.target.copy(pose.target);
      this.host.controls.update();
      return Promise.resolve();
    }
    return this.moveCamera(pose);
  }

  dispose(): void {
    if (this.body) {
      this.host.scene.remove(this.body.group);
      this.body.group.traverse(disposeObject);
      this.body = null;
    }
    this.itemsGroup.clear();
    this.trayGroup.clear();
    this.host.scene.remove(this.itemsGroup, this.trayGroup, this.hoverBox, this.selectBox);
    this.hoverBox.geometry.dispose();
    releaseItemCache();
  }
}
