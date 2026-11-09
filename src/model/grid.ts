import { LIMITS } from './defaults';
import type { MachineModel, Vec3 } from './types';

/** Geometry constants in metres, shared with the 3D layer. */
export const SLOT_W = 0.085;
export const SHELF_H = 0.24;
export const SHELF_T = 0.012;
export const SLOT_DEPTH = 0.6;
export const BASE_H = 0.45;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function clampGrid(rows: number, cols: number): { rows: number; cols: number; warnings: string[] } {
  const warnings: string[] = [];
  const r = clamp(Math.round(Number(rows) || LIMITS.rows[1]), LIMITS.rows[0], LIMITS.rows[1]);
  const c = clamp(Math.round(Number(cols) || LIMITS.cols[1]), LIMITS.cols[0], LIMITS.cols[1]);
  if (r !== rows) warnings.push(`rows=${rows} out of range ${LIMITS.rows.join('-')}, using ${r}`);
  if (c !== cols) warnings.push(`cols=${cols} out of range ${LIMITS.cols.join('-')}, using ${c}`);
  return { rows: r, cols: c, warnings };
}

export function slotCode(row: number, col: number): string {
  return `${row}${String(col).padStart(2, '0')}`;
}

export function parseCode(code: string, rows: number, cols: number): { row: number; col: number } | null {
  if (!/^\d{3}$/.test(code)) return null;
  const row = Number(code[0]);
  const col = Number(code.slice(1));
  if (row < 1 || row > rows || col < 1 || col > cols) return null;
  return { row, col };
}

export function allCodes(rows: number, cols: number): string[] {
  const out: string[] = [];
  for (let r = 1; r <= rows; r++) for (let c = 1; c <= cols; c++) out.push(slotCode(r, c));
  return out;
}

/** Width of the slot area. */
export const slotAreaWidth = (cols: number) => cols * SLOT_W;

/** Y of the shelf surface for a row (row 1 = top). */
export const shelfY = (rows: number, row: number) => BASE_H + (rows - row) * SHELF_H + SHELF_T;

/** X centre of a column; slot area is centred on x=0. */
export const colX = (cols: number, col: number) => -slotAreaWidth(cols) / 2 + (col - 0.5) * SLOT_W;

/** Front edge (z) of the slots. */
export const SLOT_FRONT_Z = SLOT_DEPTH / 2;

/** Bottom-centre position of the item at `index` (0 = front) in a slot. */
export function slotItemPosition(m: Pick<MachineModel, 'rows' | 'cols' | 'capacity'>, row: number, col: number, index: number): Vec3 {
  const pitch = SLOT_DEPTH / m.capacity;
  return {
    x: colX(m.cols, col),
    y: shelfY(m.rows, row),
    z: SLOT_FRONT_Z - pitch * (index + 0.5),
  };
}
