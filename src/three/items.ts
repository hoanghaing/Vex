import * as THREE from 'three';
import { SHAPE_DEFAULTS } from '../model/defaults';
import type { ItemType } from '../model/types';
import { SLOT_W, SHELF_H, SHELF_T } from '../model/grid';
import { labelTexture } from './textures';

interface Built { parts: { geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[]; y?: number }[]; size: { w: number; h: number; d: number } }

const cache = new Map<string, Built>();

/** Item size in metres, clamped to fit a slot. */
export function itemSize(t: ItemType): { w: number; h: number; d: number } {
  const def = SHAPE_DEFAULTS[t.shape];
  const maxW = SLOT_W * 0.92;
  const maxH = SHELF_H - SHELF_T - 0.02;
  const round = t.shape === 'can' || t.shape === 'bottle';
  let w = Math.min((t.width ?? def.w) / 100, maxW);
  const h = Math.min((t.height ?? def.h) / 100, maxH);
  let d = Math.min((t.depth ?? def.d) / 100, 0.07);
  if (round) d = w = Math.min(w, d === 0 ? w : Math.max(w, d), maxW);
  return { w, h, d };
}

const keyOf = (t: ItemType) => JSON.stringify([t.shape, t.color, t.labelText, t.labelColor, t.accentColor, t.width, t.height, t.depth]);

function build(t: ItemType): Built {
  const size = itemSize(t);
  const { w, h, d } = size;
  const label = (wrap: boolean) => labelTexture({ color: t.color, labelText: t.labelText, labelColor: t.labelColor, accentColor: t.accentColor, wrap });

  switch (t.shape) {
    case 'can': {
      const r = w / 2;
      const pts = [
        [0, 0], [r * 0.78, 0], [r * 0.92, h * 0.012], [r, h * 0.06], [r, h * 0.9],
        [r * 0.84, h * 0.975], [r * 0.84, h], [0, h],
      ].map(([x, y]) => new THREE.Vector2(x, y));
      const metal = new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 0.85, roughness: 0.3 });
      const labelMat = new THREE.MeshStandardMaterial({ map: label(true), metalness: 0.35, roughness: 0.35 });
      return {
        size,
        parts: [
          { geo: new THREE.LatheGeometry(pts, 28), mat: metal },
          { geo: new THREE.CylinderGeometry(r * 1.004, r * 1.004, h * 0.82, 28, 1, true), mat: labelMat, y: h * 0.48 },
        ],
      };
    }
    case 'bottle': {
      const r = w / 2;
      const pts = [
        [0, 0], [r * 0.85, 0], [r, h * 0.03], [r, h * 0.58], [r * 0.9, h * 0.68],
        [r * 0.5, h * 0.8], [r * 0.36, h * 0.86], [r * 0.36, h * 0.9], [0, h * 0.9],
      ].map(([x, y]) => new THREE.Vector2(x, y));
      const glass = new THREE.MeshStandardMaterial({ color: t.color, transparent: true, opacity: 0.72, roughness: 0.08, metalness: 0 });
      const cap = new THREE.MeshStandardMaterial({ color: t.accentColor ?? t.labelColor, roughness: 0.5 });
      const labelMat = new THREE.MeshStandardMaterial({ map: label(true), roughness: 0.5 });
      return {
        size,
        parts: [
          { geo: new THREE.LatheGeometry(pts, 24), mat: glass },
          { geo: new THREE.CylinderGeometry(r * 0.38, r * 0.38, h * 0.1, 16), mat: cap, y: h * 0.95 },
          { geo: new THREE.CylinderGeometry(r * 1.01, r * 1.01, h * 0.26, 24, 1, true), mat: labelMat, y: h * 0.36 },
        ],
      };
    }
    case 'box': {
      const side = new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.6 });
      const front = new THREE.MeshStandardMaterial({ map: label(false), roughness: 0.6 });
      const geo = new THREE.BoxGeometry(w, h, d);
      return { size, parts: [{ geo, mat: [side, side, side, side, front, side], y: h / 2 }] };
    }
    case 'bag': {
      const geo = new THREE.BoxGeometry(w, h, d, 8, 12, 2);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / (h / 2); // -1..1
        const x = pos.getX(i) / (w / 2);
        const edge = Math.abs(y) > 0.86 ? 0.15 : 1; // crimped ends
        const puff = (1 - y * y * 0.6) * (1 - x * x * 0.35) * edge;
        pos.setZ(i, pos.getZ(i) * puff);
      }
      geo.computeVertexNormals();
      const side = new THREE.MeshStandardMaterial({ color: t.color, roughness: 0.35, metalness: 0.25 });
      const front = new THREE.MeshStandardMaterial({ map: label(false), roughness: 0.35, metalness: 0.2 });
      return { size, parts: [{ geo, mat: [side, side, side, side, front, front], y: h / 2 }] };
    }
  }
}

/** Create an item object (bottom-centre origin). Geometry & materials are shared per item type. */
export function itemObject(t: ItemType): THREE.Group {
  const key = keyOf(t);
  let b = cache.get(key);
  if (!b) cache.set(key, (b = build(t)));
  const g = new THREE.Group();
  for (const p of b.parts) {
    const m = new THREE.Mesh(p.geo, p.mat);
    m.position.y = p.y ?? 0;
    g.add(m);
  }
  g.userData.itemType = t.id;
  g.userData.shared = true;
  return g;
}

let users = 0;
/** Reference-count the shared cache across machine instances. */
export function retainItemCache(): void { users++; }
export function releaseItemCache(): void {
  users = Math.max(0, users - 1);
  if (users === 0) disposeItemCache();
}

export function disposeItemCache(): void {
  for (const b of cache.values()) {
    for (const p of b.parts) {
      p.geo.dispose();
      for (const m of Array.isArray(p.mat) ? p.mat : [p.mat]) {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      }
    }
  }
  cache.clear();
}
