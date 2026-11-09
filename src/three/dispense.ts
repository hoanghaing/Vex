import * as THREE from 'three';
import { SLOT_DEPTH, SLOT_FRONT_Z } from '../model/grid';
import type { MachineModel } from '../model/types';
import { type AnimSignal, easing, tween } from './anim';
import type { SceneHost } from './scene';
import type { MachineView } from './view';

/**
 * Spring turns, front item slides off the shelf, falls into the tray and bounces.
 * Resolves with the item now lying in the tray (or null if cancelled).
 */
export async function playDispense(host: SceneHost, view: MachineView, model: MachineModel, code: string, signal: AnimSignal): Promise<THREE.Object3D | null> {
  const body = view.body;
  const item = view.takeFront(code);
  if (!body || !item) return null;
  const rest = view.itemsOf(code);
  const spring = body.springs.get(code);
  const pitch = SLOT_DEPTH / model.capacity;

  const camDone = view.overview();

  // 1. spring turn + everything advances one pitch
  const z0 = item.position.z;
  const restZ = rest.map((o) => o.position.z);
  const springRot = spring?.rotation.z ?? 0;
  await signal.track(tween(host, 0.7, (t) => {
    if (spring) spring.rotation.z = springRot - t * Math.PI * 2;
    item.position.z = z0 + t * (SLOT_FRONT_Z + 0.03 - z0);
    rest.forEach((o, i) => (o.position.z = restZ[i] + t * pitch));
  }, easing.easeInOutCubic)).promise;
  if (signal.cancelled) return abort(item);

  // 2. tip over and fall (re-parent so a re-sync of slot items can't remove it)
  view.trayGroup.attach(item);
  const from = item.position.clone();
  const to = body.trayPos.clone();
  to.x += (Math.random() - 0.5) * 0.12;
  to.z += (Math.random() - 0.5) * 0.04;
  const lyingY = to.y + itemThickness(item) / 2;
  const spin = (Math.random() < 0.5 ? -1 : 1) * Math.PI / 2;
  const fallDur = Math.min(0.6, Math.max(0.3, Math.sqrt((from.y - lyingY) / 4.9)));
  await signal.track(tween(host, fallDur, (t) => {
    item.position.x = from.x + (to.x - from.x) * t;
    item.position.z = from.z + (to.z - from.z) * Math.min(1, t * 1.6);
    item.position.y = from.y + (lyingY - from.y) * t;
    item.rotation.x = -Math.PI / 2 * Math.min(1, t * 1.4);
    item.rotation.z = spin * t * 0.3;
  }, easing.easeInQuad)).promise;
  if (signal.cancelled) return abort(item);

  // 3. bounce
  await signal.track(tween(host, 0.45, (t) => {
    item.position.y = lyingY + (1 - easing.easeOutBounce(t)) * 0.035;
  }, easing.linear)).promise;
  if (signal.cancelled) return abort(item);

  view.addToTray(item);
  await camDone;
  return item;
}

function itemThickness(o: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(o);
  const s = box.getSize(new THREE.Vector3());
  return Math.min(s.x, s.z) || 0.05;
}

function abort(item: THREE.Object3D): null {
  item.removeFromParent();
  return null;
}

/** Fade out and remove an item picked up from the tray. */
export async function pickUp(host: SceneHost, item: THREE.Object3D): Promise<void> {
  const y0 = item.position.y;
  await tween(host, 0.35, (t) => {
    item.position.y = y0 + t * 0.08;
    item.scale.setScalar(1 - t * 0.6);
  }, easing.easeOutCubic).promise;
  item.removeFromParent();
}
