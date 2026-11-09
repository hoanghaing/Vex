import { slotCode, parseCode, allCodes, clampGrid, slotItemPosition } from '../src/model/grid';
import { DEFAULT_MODEL } from '../src/model/defaults';

describe('slot codes', () => {
  it('formats row + 2-digit col', () => {
    expect(slotCode(1, 1)).toBe('101');
    expect(slotCode(6, 10)).toBe('610');
  });
  it('parses valid codes and rejects invalid ones', () => {
    expect(parseCode('203', 6, 10)).toEqual({ row: 2, col: 3 });
    expect(parseCode('711', 6, 10)).toBeNull();
    expect(parseCode('611', 6, 10)).toBeNull();
    expect(parseCode('2a3', 6, 10)).toBeNull();
    expect(parseCode('600', 6, 10)).toBeNull();
  });
  it('lists all codes row-major', () => {
    expect(allCodes(4, 6)).toHaveLength(24);
    expect(allCodes(6, 10)[0]).toBe('101');
    expect(allCodes(6, 10)[59]).toBe('610');
  });
});

describe('clampGrid', () => {
  it('clamps out-of-range values with warnings', () => {
    const r = clampGrid(3, 12);
    expect(r).toMatchObject({ rows: 4, cols: 10 });
    expect(r.warnings).toHaveLength(2);
  });
  it('keeps in-range values silently', () => {
    expect(clampGrid(5, 8).warnings).toHaveLength(0);
  });
});

describe('slotItemPosition', () => {
  it('row 1 is on top, col increases to the right, index goes deeper', () => {
    const m = DEFAULT_MODEL();
    const a = slotItemPosition(m, 1, 1, 0);
    const b = slotItemPosition(m, 2, 1, 0);
    const c = slotItemPosition(m, 1, 2, 0);
    const d = slotItemPosition(m, 1, 1, 1);
    expect(a.y).toBeGreaterThan(b.y);
    expect(c.x).toBeGreaterThan(a.x);
    expect(d.z).toBeLessThan(a.z);
  });
});
