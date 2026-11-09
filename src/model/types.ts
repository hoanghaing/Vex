export type Shape = 'can' | 'bottle' | 'box' | 'bag';
export const SHAPES: readonly Shape[] = ['can', 'bottle', 'box', 'bag'];

export interface ItemType {
  id: string;
  name: string;
  shape: Shape;
  color: string;
  labelText: string;
  labelColor: string;
  accentColor?: string;
  /** Override sizes in cm. */
  width?: number;
  height?: number;
  depth?: number;
  /** Reserved for future glTF support; parsed and preserved, not rendered. */
  model?: string;
  /** Unknown attributes preserved for round-trip. */
  extra?: Record<string, string>;
}

export interface Slot {
  code: string;
  itemType: string;
  price: number;
  stock: number;
}

export interface Theme {
  body: string;
  accent: string;
  glassOpacity: number;
}

export interface MachineModel {
  version: 1;
  name: string;
  rows: number;
  cols: number;
  capacity: number;
  theme: Theme;
  itemTypes: ItemType[];
  slots: Record<string, Slot>;
}

export interface Vec3 { x: number; y: number; z: number }
