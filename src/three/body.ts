import * as THREE from 'three';
import type { MachineModel } from '../model/types';
import { BASE_H, SHELF_H, SHELF_T, SLOT_DEPTH, SLOT_FRONT_Z, SLOT_W, allCodes, colX, parseCode, shelfY, slotAreaWidth } from '../model/grid';
import { codeTagTexture, createLed, headerTexture, keyTexture, textTexture, type LedDisplay } from './textures';

export const WALL = 0.04;
export const PANEL_W = 0.3;
export const HEADER_H = 0.16;
export const FRONT_Z = SLOT_DEPTH / 2 + 0.06;
export const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'] as const;

export interface MachineDims { W: number; H: number; D: number; left: number; right: number; panelX: number }

export function machineDims(m: Pick<MachineModel, 'rows' | 'cols'>): MachineDims {
  const W = slotAreaWidth(m.cols);
  const H = BASE_H + m.rows * SHELF_H + HEADER_H;
  const D = SLOT_DEPTH + 0.16;
  const left = -W / 2 - WALL;
  const right = W / 2 + WALL + PANEL_W + WALL;
  return { W, H, D, left, right, panelX: W / 2 + WALL + PANEL_W / 2 };
}

export interface BodyPick {
  slots: Map<THREE.Object3D, string>;
  keys: Map<THREE.Object3D, string>;
  coinSlot: THREE.Object3D;
  refundBtn: THREE.Object3D;
  trayFlap: THREE.Object3D;
}

export interface Body {
  group: THREE.Group;
  pick: BodyPick;
  springs: Map<string, THREE.Object3D>;
  keyMeshes: Map<string, THREE.Mesh>;
  led: LedDisplay;
  trayPos: THREE.Vector3;
  dims: MachineDims;
  slotCenter(code: string): THREE.Vector3;
}

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

function helixGeometry(length: number, radius: number, turns: number): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const n = turns * 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.sin(a) * radius, Math.cos(a) * radius, length / 2 - t * length));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 24, 0.0028, 6, false);
}

export function buildBody(m: MachineModel): Body {
  const dims = machineDims(m);
  const { W, H, D, left, right, panelX } = dims;
  const g = new THREE.Group();
  g.name = 'vm3d-body';

  const bodyMat = new THREE.MeshStandardMaterial({ color: m.theme.body, roughness: 0.45, metalness: 0.15 });
  const accentMat = new THREE.MeshStandardMaterial({ color: m.theme.accent, roughness: 0.5, metalness: 0.2 });
  const innerMat = new THREE.MeshStandardMaterial({ color: '#f4f5f7', roughness: 0.9 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: '#b9bec6', roughness: 0.4, metalness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#16181c', roughness: 0.7 });
  const springMat = new THREE.MeshStandardMaterial({ color: '#d7dbe0', roughness: 0.25, metalness: 0.9 });

  const totalW = right - left;
  const cx = (left + right) / 2;
  const backZ = -D / 2;

  // cabinet shell
  g.add(box(totalW, H, WALL, bodyMat, cx, H / 2, backZ + WALL / 2));                     // back
  g.add(box(WALL, H, D, bodyMat, left + WALL / 2, H / 2, 0));                              // left
  g.add(box(WALL, H, D, bodyMat, right - WALL / 2, H / 2, 0));                             // right
  g.add(box(WALL, H, D, bodyMat, W / 2 + WALL / 2, H / 2, 0));                             // divider
  g.add(box(totalW, WALL, D, bodyMat, cx, H - WALL / 2, 0));                               // top
  g.add(box(totalW, 0.06, D, darkMat, cx, 0.03, 0));                                       // plinth
  g.add(box(W, H - BASE_H - HEADER_H, 0.005, innerMat, 0, BASE_H + (H - BASE_H - HEADER_H) / 2, backZ + WALL + 0.003)); // inner back

  // header with name
  const header = new THREE.Mesh(
    new THREE.PlaneGeometry(W + WALL * 2, HEADER_H - WALL),
    new THREE.MeshStandardMaterial({ map: headerTexture(m.name || ' ', m.theme.body), roughness: 0.5 }),
  );
  header.position.set(0, H - HEADER_H / 2 - WALL / 2 + 0.01, FRONT_Z);
  g.add(header);
  g.add(box(W + WALL * 2, HEADER_H, 0.04, bodyMat, 0, H - HEADER_H / 2, FRONT_Z - 0.021));

  // lower front panel with tray opening
  const lowerH = BASE_H - 0.06;
  const trayW = Math.min(W * 0.7, 0.5);
  const trayY0 = 0.1, trayY1 = 0.3;
  const sideW = (W + WALL * 2 - trayW) / 2;
  g.add(box(sideW, lowerH, 0.03, bodyMat, -W / 2 - WALL + sideW / 2, 0.06 + lowerH / 2, FRONT_Z - 0.015));
  g.add(box(sideW, lowerH, 0.03, bodyMat, W / 2 + WALL - sideW / 2, 0.06 + lowerH / 2, FRONT_Z - 0.015));
  g.add(box(trayW, trayY0 - 0.06, 0.03, bodyMat, 0, 0.06 + (trayY0 - 0.06) / 2, FRONT_Z - 0.015));
  g.add(box(trayW, BASE_H - trayY1, 0.03, bodyMat, 0, trayY1 + (BASE_H - trayY1) / 2, FRONT_Z - 0.015));
  // tray recess
  g.add(box(trayW, 0.01, 0.2, darkMat, 0, trayY0, FRONT_Z - 0.11));
  g.add(box(trayW, trayY1 - trayY0, 0.01, darkMat, 0, (trayY0 + trayY1) / 2, FRONT_Z - 0.21));
  const flap = new THREE.Mesh(
    new THREE.PlaneGeometry(trayW, 0.07),
    new THREE.MeshStandardMaterial({ color: '#2a2e35', transparent: true, opacity: 0.85, roughness: 0.3, side: THREE.DoubleSide }),
  );
  flap.position.set(0, trayY1 - 0.035, FRONT_Z + 0.002);
  g.add(flap);
  const trayLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.04), new THREE.MeshBasicMaterial({ map: textTexture('PUSH', 256, 64, '#ffffff'), transparent: true }));
  trayLabel.position.set(0, trayY1 - 0.035, FRONT_Z + 0.004);
  g.add(trayLabel);
  const trayPos = new THREE.Vector3(0, trayY0 + 0.005, FRONT_Z - 0.09);

  // glass
  const glassH = H - HEADER_H - BASE_H;
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(W, glassH),
    new THREE.MeshPhysicalMaterial({ color: '#cfe9ff', transparent: true, opacity: m.theme.glassOpacity, roughness: 0.05, metalness: 0, depthWrite: false }),
  );
  glass.position.set(0, BASE_H + glassH / 2, FRONT_Z - 0.01);
  glass.renderOrder = 10;
  g.add(glass);
  // glass frame
  g.add(box(W + WALL * 2, 0.02, 0.03, accentMat, 0, BASE_H, FRONT_Z - 0.01));

  // shelves, lips, tags, springs, slot pick volumes
  const springs = new Map<string, THREE.Object3D>();
  const slots = new Map<THREE.Object3D, string>();
  const helix = helixGeometry(SLOT_DEPTH * 0.96, SLOT_W * 0.4, m.capacity);
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  const pickGeo = new THREE.BoxGeometry(SLOT_W, SHELF_H - SHELF_T, SLOT_DEPTH);
  const tagGeo = new THREE.PlaneGeometry(SLOT_W * 0.6, 0.022);
  for (let r = 1; r <= m.rows; r++) {
    const y = shelfY(m.rows, r);
    g.add(box(W, SHELF_T, SLOT_DEPTH, shelfMat, 0, y - SHELF_T / 2, 0));
    g.add(box(W, 0.032, 0.008, darkMat, 0, y - 0.016, SLOT_FRONT_Z + 0.004));
  }
  for (const code of allCodes(m.rows, m.cols)) {
    const { row, col } = parseCode(code, m.rows, m.cols)!;
    const x = colX(m.cols, col);
    const y = shelfY(m.rows, row);
    const tag = new THREE.Mesh(tagGeo, new THREE.MeshBasicMaterial({ map: codeTagTexture(code) }));
    tag.position.set(x, y - 0.016, SLOT_FRONT_Z + 0.0085);
    g.add(tag);
    const spring = new THREE.Mesh(helix, springMat);
    spring.position.set(x, y + SLOT_W * 0.4 + 0.003, 0);
    spring.userData.code = code;
    springs.set(code, spring);
    g.add(spring);
    const pv = new THREE.Mesh(pickGeo, pickMat);
    pv.position.set(x, y + (SHELF_H - SHELF_T) / 2, 0);
    pv.userData.code = code;
    slots.set(pv, code);
    g.add(pv);
  }
  // control panel
  const panelFace = box(PANEL_W - 0.02, H - BASE_H - HEADER_H, 0.012, accentMat, panelX, BASE_H + (H - BASE_H - HEADER_H) / 2, FRONT_Z - 0.006);
  g.add(panelFace);
  g.add(box(PANEL_W, H, 0.03, bodyMat, panelX, H / 2, FRONT_Z - 0.03));
  const top = H - HEADER_H - 0.04;
  const led = createLed(PANEL_W - 0.06, 0.06);
  led.mesh.position.set(panelX, top - 0.05, FRONT_Z + 0.001);
  g.add(led.mesh);

  const keys = new Map<THREE.Object3D, string>();
  const keyMeshes = new Map<string, THREE.Mesh>();
  const kw = 0.062, kh = 0.044, gap = 0.012;
  const kx0 = panelX - (kw + gap);
  const ky0 = top - 0.14;
  KEYS.forEach((k, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const isOk = k === 'OK', isC = k === 'C';
    const face = keyTexture(k, isOk ? '#21a453' : isC ? '#e0a100' : '#e8e8e8', isOk || isC ? '#ffffff' : '#222');
    const side = new THREE.MeshStandardMaterial({ color: '#bbbbbb', roughness: 0.5 });
    const front = new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 });
    const key = new THREE.Mesh(new THREE.BoxGeometry(kw, kh, 0.016), [side, side, side, side, front, side]);
    key.position.set(kx0 + col * (kw + gap), ky0 - row * (kh + gap), FRONT_Z + 0.008);
    key.userData.key = k;
    key.userData.restZ = key.position.z;
    keys.set(key, k);
    keyMeshes.set(k, key);
    g.add(key);
  });

  const coinY = ky0 - 4 * (kh + gap) - 0.04;
  const coinSlot = box(0.12, 0.06, 0.02, darkMat, panelX - 0.05, coinY, FRONT_Z + 0.01);
  const slit = box(0.008, 0.04, 0.005, new THREE.MeshBasicMaterial({ color: '#000' }), panelX - 0.05, coinY, FRONT_Z + 0.021);
  g.add(coinSlot, slit);
  const coinLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.025), new THREE.MeshBasicMaterial({ map: textTexture('TIỀN / CASH', 256, 54, '#ffffff'), transparent: true }));
  coinLabel.position.set(panelX - 0.05, coinY - 0.05, FRONT_Z + 0.001);
  g.add(coinLabel);
  const refundBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 24), new THREE.MeshStandardMaterial({ color: '#d32f2f', roughness: 0.4 }));
  refundBtn.rotation.x = Math.PI / 2;
  refundBtn.position.set(panelX + 0.08, coinY, FRONT_Z + 0.01);
  g.add(refundBtn);
  const refundLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.025), new THREE.MeshBasicMaterial({ map: textTexture('TRẢ TIỀN', 256, 64, '#ffffff'), transparent: true }));
  refundLabel.position.set(panelX + 0.08, coinY - 0.05, FRONT_Z + 0.001);
  g.add(refundLabel);

  const slotCenter = (code: string) => {
    const rc = parseCode(code, m.rows, m.cols);
    if (!rc) return new THREE.Vector3(0, H / 2, 0);
    return new THREE.Vector3(colX(m.cols, rc.col), shelfY(m.rows, rc.row) + (SHELF_H - SHELF_T) / 2, 0);
  };

  return { group: g, pick: { slots, keys, coinSlot, refundBtn, trayFlap: flap }, springs, keyMeshes, led, trayPos, dims, slotCenter };
}
