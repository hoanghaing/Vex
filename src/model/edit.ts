import { LIMITS } from './defaults';
import { clampGrid, parseCode } from './grid';
import type { ItemType, MachineModel, Slot, Theme } from './types';

const clone = <T>(v: T): T => structuredClone(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function setSlot(m: MachineModel, code: string, patch: Partial<Omit<Slot, 'code'>>): MachineModel {
  if (!parseCode(code, m.rows, m.cols)) throw new Error(`Invalid slot code "${code}"`);
  const prev = m.slots[code];
  const itemType = patch.itemType ?? prev?.itemType;
  if (!itemType) throw new Error(`Slot ${code} needs an itemType`);
  if (!m.itemTypes.some((t) => t.id === itemType)) throw new Error(`Unknown itemType "${itemType}"`);
  const n = clone(m);
  n.slots[code] = {
    code,
    itemType,
    price: Math.max(0, Math.floor(patch.price ?? prev?.price ?? 0)),
    stock: clamp(Math.floor(patch.stock ?? prev?.stock ?? m.capacity), 0, m.capacity),
  };
  return n;
}

export function clearSlot(m: MachineModel, code: string): MachineModel {
  const n = clone(m);
  delete n.slots[code];
  return n;
}

export function upsertItemType(m: MachineModel, t: ItemType): MachineModel {
  const n = clone(m);
  const i = n.itemTypes.findIndex((x) => x.id === t.id);
  if (i >= 0) n.itemTypes[i] = clone(t);
  else n.itemTypes.push(clone(t));
  return n;
}

export function removeItemType(m: MachineModel, id: string): { model: MachineModel; clearedCodes: string[] } {
  const n = clone(m);
  n.itemTypes = n.itemTypes.filter((t) => t.id !== id);
  const clearedCodes = Object.values(n.slots).filter((s) => s.itemType === id).map((s) => s.code).sort();
  for (const c of clearedCodes) delete n.slots[c];
  return { model: n, clearedCodes };
}

export function resizeGrid(m: MachineModel, rows: number, cols: number): { model: MachineModel; droppedCodes: string[]; warnings: string[] } {
  const g = clampGrid(rows, cols);
  const n = clone(m);
  n.rows = g.rows;
  n.cols = g.cols;
  const droppedCodes = Object.keys(n.slots).filter((c) => !parseCode(c, g.rows, g.cols)).sort();
  for (const c of droppedCodes) delete n.slots[c];
  return { model: n, droppedCodes, warnings: g.warnings };
}

export function setCapacity(m: MachineModel, cap: number): { model: MachineModel; clampedCodes: string[] } {
  const n = clone(m);
  n.capacity = clamp(Math.round(cap) || 1, LIMITS.capacity[0], LIMITS.capacity[1]);
  const clampedCodes: string[] = [];
  for (const s of Object.values(n.slots)) {
    if (s.stock > n.capacity) {
      s.stock = n.capacity;
      clampedCodes.push(s.code);
    }
  }
  return { model: n, clampedCodes };
}

/** Codes that would be affected, without applying (for confirmation prompts). */
export const previewResize = (m: MachineModel, rows: number, cols: number) => resizeGrid(m, rows, cols).droppedCodes;
export const previewCapacity = (m: MachineModel, cap: number) => setCapacity(m, cap).clampedCodes;
export const slotsUsing = (m: MachineModel, id: string) =>
  Object.values(m.slots).filter((s) => s.itemType === id).map((s) => s.code).sort();

export function setMeta(m: MachineModel, patch: Partial<{ name: string; theme: Partial<Theme> }>): MachineModel {
  const n = clone(m);
  if (patch.name !== undefined) n.name = patch.name;
  if (patch.theme) n.theme = { ...n.theme, ...patch.theme, glassOpacity: clamp(patch.theme.glassOpacity ?? n.theme.glassOpacity, 0, 1) };
  return n;
}
