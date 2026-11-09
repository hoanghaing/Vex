import { setSlot, clearSlot, upsertItemType, removeItemType, resizeGrid, setCapacity, setMeta } from '../src/model/edit';
import { History } from '../src/model/history';
import { DEFAULT_MODEL } from '../src/model/defaults';
import type { MachineModel } from '../src/model/types';

function base(): MachineModel {
  let m = DEFAULT_MODEL();
  m = upsertItemType(m, { id: 'cola', name: 'Cola', shape: 'can', color: '#f00', labelText: 'C', labelColor: '#fff' });
  m = upsertItemType(m, { id: 'chip', name: 'Chip', shape: 'bag', color: '#ff0', labelText: 'P', labelColor: '#000' });
  m = setSlot(m, '610', { itemType: 'cola', price: 10000, stock: 6 });
  m = setSlot(m, '203', { itemType: 'chip', price: 8000, stock: 6 });
  return m;
}

describe('edit operations', () => {
  it('setSlot does not mutate input and clamps values', () => {
    const m = base();
    const snapshot = JSON.stringify(m);
    const n = setSlot(m, '101', { itemType: 'cola', price: -3, stock: 99 });
    expect(JSON.stringify(m)).toBe(snapshot);
    expect(n.slots['101']).toEqual({ code: '101', itemType: 'cola', price: 0, stock: 8 });
  });

  it('setSlot patches an existing slot', () => {
    const n = setSlot(base(), '203', { price: 9000 });
    expect(n.slots['203']).toMatchObject({ itemType: 'chip', price: 9000, stock: 6 });
  });

  it('setSlot throws on unknown itemType or invalid code', () => {
    expect(() => setSlot(base(), '101', { itemType: 'ghost' })).toThrow();
    expect(() => setSlot(base(), '711', { itemType: 'cola' })).toThrow();
    expect(() => setSlot(base(), '102', { price: 1 })).toThrow(); // new slot needs itemType
  });

  it('clearSlot removes the slot', () => {
    expect(clearSlot(base(), '203').slots['203']).toBeUndefined();
  });

  it('upsertItemType replaces by id', () => {
    const n = upsertItemType(base(), { id: 'cola', name: 'Cola Zero', shape: 'can', color: '#000', labelText: 'Z', labelColor: '#fff' });
    expect(n.itemTypes.filter((t) => t.id === 'cola')).toHaveLength(1);
    expect(n.itemTypes.find((t) => t.id === 'cola')!.name).toBe('Cola Zero');
  });

  it('removeItemType clears slots using it', () => {
    const r = removeItemType(base(), 'cola');
    expect(r.clearedCodes).toEqual(['610']);
    expect(r.model.slots['610']).toBeUndefined();
    expect(r.model.itemTypes.map((t) => t.id)).toEqual(['chip']);
  });

  it('resizeGrid drops slots outside the new grid', () => {
    const r = resizeGrid(base(), 5, 8);
    expect(r.droppedCodes).toEqual(['610']);
    expect(r.model.slots['203']).toBeDefined();
    expect(r.model).toMatchObject({ rows: 5, cols: 8 });
  });

  it('resizeGrid clamps with warnings', () => {
    const r = resizeGrid(base(), 2, 20);
    expect(r.model).toMatchObject({ rows: 4, cols: 10 });
    expect(r.warnings).toHaveLength(2);
  });

  it('setCapacity clamps stock', () => {
    const r = setCapacity(base(), 4);
    expect(r.model.capacity).toBe(4);
    expect(r.model.slots['203'].stock).toBe(4);
    expect(r.clampedCodes.sort()).toEqual(['203', '610']);
    expect(setCapacity(base(), 50).model.capacity).toBe(12);
  });

  it('setMeta updates name and theme', () => {
    const n = setMeta(base(), { name: 'X', theme: { body: '#000', accent: '#111', glassOpacity: 0.5 } });
    expect(n.name).toBe('X');
    expect(n.theme.glassOpacity).toBe(0.5);
  });
});

describe('History', () => {
  it('undo/redo and branch truncation', () => {
    const h = new History<number>(0);
    h.push(1); h.push(2); h.push(3);
    expect(h.undo()).toBe(2);
    expect(h.undo()).toBe(1);
    expect(h.redo()).toBe(2);
    h.push(9);
    expect(h.canRedo).toBe(false);
    expect(h.redo()).toBeNull();
    expect(h.current).toBe(9);
  });

  it('drops oldest when exceeding limit', () => {
    const h = new History<number>(0, 3);
    h.push(1); h.push(2); h.push(3); h.push(4);
    expect(h.undo()).toBe(3);
    expect(h.undo()).toBe(2);
    expect(h.undo()).toBeNull();
    expect(h.canUndo).toBe(false);
  });

  it('stores clones so later mutation does not leak', () => {
    const o = { a: 1 };
    const h = new History(o);
    o.a = 2;
    expect(h.current.a).toBe(1);
  });
});
