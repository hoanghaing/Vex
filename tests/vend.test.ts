import { VendState } from '../src/vend/machine';
import { DEFAULT_MESSAGES, formatMoney } from '../src/core/messages';
import type { Slot } from '../src/model/types';

function setup(slots: Record<string, Slot>) {
  const vs = new VendState((c) => slots[c], (c) => /^[1-6](0[1-9]|10)$/.test(c), DEFAULT_MESSAGES);
  const log: any[] = [];
  for (const ev of ['display', 'balance', 'error', 'dispense', 'refund'] as const) vs.on(ev, (p: any) => log.push([ev, p]));
  const of = (ev: string) => log.filter((l) => l[0] === ev).map((l) => l[1]);
  return { vs, of };
}
const slots = (): Record<string, Slot> => ({
  '203': { code: '203', itemType: 'cola', price: 15000, stock: 3 },
  '101': { code: '101', itemType: 'free', price: 0, stock: 1 },
  '102': { code: '102', itemType: 'cola', price: 15000, stock: 0 },
});
const type = (vs: VendState, s: string) => [...s].forEach((k) => vs.press(k as any));

describe('VendState', () => {
  it('formats money vi-VN', () => {
    expect(formatMoney(5000)).toBe('5.000');
  });

  it('invalid code → MA_SAI, balance kept', () => {
    const { vs, of } = setup(slots());
    vs.insertMoney(20000);
    type(vs, '999'); vs.press('OK');
    expect(of('error')[0]).toMatchObject({ code: '999', reason: 'MA_SAI' });
    expect(vs.balance).toBe(20000);
    expect(of('display')).toContain('MA SAI');
  });

  it('empty slot / unassigned code → HET_HANG', () => {
    const { vs, of } = setup(slots());
    vs.insertMoney(20000);
    vs.select('102');
    vs.select('105');
    expect(of('error').map((e) => e.reason)).toEqual(['HET_HANG', 'HET_HANG']);
  });

  it('insufficient money → THIEU_TIEN with missing amount', () => {
    const { vs, of } = setup(slots());
    vs.insertMoney(10000);
    vs.select('203');
    expect(of('error')[0]).toMatchObject({ reason: 'THIEU_TIEN', missing: 5000 });
    expect(of('display')).toContain('THIEU 5.000');
    expect(of('dispense')).toHaveLength(0);
  });

  it('enough money → dispense with change, balance 0, locked', () => {
    const { vs, of } = setup(slots());
    vs.insertMoney(10000); vs.insertMoney(10000);
    type(vs, '203'); vs.press('OK');
    expect(of('dispense')[0]).toEqual({ code: '203', itemType: 'cola', price: 15000, change: 5000 });
    expect(vs.balance).toBe(0);
    expect(vs.locked).toBe(true);
    expect(of('display')).toContain('TIEN THOI 5.000');
  });

  it('exact money → change 0', () => {
    const { vs, of } = setup(slots());
    vs.insertMoney(15000);
    vs.select('203');
    expect(of('dispense')[0].change).toBe(0);
  });

  it('price 0 can be bought with zero balance', () => {
    const { vs, of } = setup(slots());
    vs.select('101');
    expect(of('dispense')[0]).toMatchObject({ code: '101', price: 0, change: 0 });
  });

  it('while locked, input is ignored and no double dispense', () => {
    const { vs, of } = setup(slots());
    vs.insertMoney(50000);
    type(vs, '203'); vs.press('OK'); vs.press('OK'); vs.press('OK');
    expect(vs.insertMoney(10000)).toBe(false);
    vs.select('203');
    expect(of('dispense')).toHaveLength(1);
    vs.unlock();
    expect(vs.insertMoney(10000)).toBe(true);
  });

  it('C clears input, 4th digit ignored', () => {
    const { vs } = setup(slots());
    type(vs, '2034');
    expect(vs.input).toBe('203');
    vs.press('C');
    expect(vs.input).toBe('');
  });

  it('refund returns balance', () => {
    const { vs, of } = setup(slots());
    vs.insertMoney(7000);
    expect(vs.refund()).toBe(7000);
    expect(vs.balance).toBe(0);
    expect(of('refund')).toEqual([7000]);
  });

  it('rejects non-positive money', () => {
    const { vs } = setup(slots());
    expect(vs.insertMoney(0)).toBe(false);
    expect(vs.insertMoney(-5)).toBe(false);
  });

  it('reset clears everything', () => {
    const { vs } = setup(slots());
    vs.insertMoney(5000); vs.select('101');
    vs.reset();
    expect([vs.balance, vs.input, vs.locked]).toEqual([0, '', false]);
  });
});
