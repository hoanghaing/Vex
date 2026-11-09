import type { MachineModel, Shape } from './types';

export const LIMITS = {
  rows: [4, 6] as const,
  cols: [6, 10] as const,
  capacity: [1, 12] as const,
};

export const DEFAULTS = { rows: 6, cols: 10, capacity: 8 };

/** Default sizes in cm (w × h × d). */
export const SHAPE_DEFAULTS: Record<Shape, { w: number; h: number; d: number }> = {
  can: { w: 6.6, h: 12.2, d: 6.6 },
  bottle: { w: 6.5, h: 20, d: 6.5 },
  box: { w: 9, h: 12, d: 4 },
  bag: { w: 12, h: 16, d: 4 },
};

export function DEFAULT_MODEL(): MachineModel {
  return {
    version: 1,
    name: 'Vending Machine',
    rows: DEFAULTS.rows,
    cols: DEFAULTS.cols,
    capacity: DEFAULTS.capacity,
    theme: { body: '#c8102e', accent: '#1a1a1a', glassOpacity: 0.25 },
    itemTypes: [],
    slots: {},
  };
}
