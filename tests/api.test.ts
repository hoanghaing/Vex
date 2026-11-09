import { createVendingMachine, VendingXMLError } from '../src/index';
import type { VendingMachine, VendingOptions } from '../src/index';

const XML = `<?xml version="1.0"?>
<vendingMachine version="1" name="T" rows="6" cols="10" capacity="8">
  <itemTypes>
    <itemType id="cola" name="Cola" shape="can" color="#f00" labelText="C" labelColor="#fff"/>
  </itemTypes>
  <slots>
    <slot code="203" itemType="cola" price="15000" stock="6"/>
    <slot code="610" itemType="cola" price="10000" stock="2"/>
  </slots>
</vendingMachine>`;

function make(opts: VendingOptions = {}) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const vm = createVendingMachine(el, { headless: true, xml: XML, ...opts });
  const events: Record<string, any[]> = {};
  for (const e of ['change', 'purchase', 'error', 'warning', 'modechange', 'balance'] as const)
    vm.on(e, (p: any) => (events[e] ??= []).push(p));
  return { vm, el, events };
}
const stockIn = (xml: string, code: string) => Number(new RegExp(`code="${code}"[^>]*stock="([0-9]+)"`).exec(xml)![1]);
const buy = (vm: VendingMachine, code: string, money: number) => { vm.insertMoney(money); vm.select(code); };

describe('public API', () => {
  it('sandbox play does not change XML or emit change', () => {
    const { vm, events } = make();
    vm.setMode('play');
    buy(vm, '203', 20000);
    expect(events.purchase).toHaveLength(1);
    expect(events.purchase[0]).toMatchObject({ code: '203', change: 5000 });
    expect(stockIn(vm.toXML(), '203')).toBe(6);
    expect(events.change).toBeUndefined();
    vm.setMode('edit');
    expect(stockIn(vm.toXML(), '203')).toBe(6);
  });

  it('sandbox stock still decreases inside play session', () => {
    const { vm, events } = make();
    vm.setMode('play');
    buy(vm, '610', 10000); buy(vm, '610', 10000); buy(vm, '610', 10000);
    expect(events.purchase).toHaveLength(2);
    expect(events.error.at(-1)).toMatchObject({ reason: 'HET_HANG' });
  });

  it('sell-only machine persists sales and refuses edit mode', () => {
    const { vm, events } = make({ allowEdit: false });
    expect(vm.mode).toBe('play');
    buy(vm, '203', 15000);
    expect(stockIn(vm.toXML(), '203')).toBe(5);
    expect(events.change).toHaveLength(1);
    expect(stockIn(events.change[0].xml, '203')).toBe(5);
    vm.setMode('edit');
    expect(vm.mode).toBe('play');
    expect(events.warning.length).toBeGreaterThan(0);
  });

  it('persistSales can be forced on an editable machine', () => {
    const { vm } = make({ persistSales: true });
    vm.setMode('play');
    buy(vm, '203', 15000);
    vm.setMode('edit');
    expect(stockIn(vm.toXML(), '203')).toBe(5);
  });

  it('load error keeps previous model', () => {
    const { vm } = make();
    const before = vm.toXML();
    expect(() => vm.load('<bad')).toThrow(VendingXMLError);
    expect(vm.toXML()).toBe(before);
  });

  it('load emits warnings for clamped values', () => {
    const { vm, events } = make();
    vm.load(XML.replace('rows="6"', 'rows="9"'));
    expect(events.warning.join()).toContain('rows');
  });

  it('resizeGrid respects confirmation', async () => {
    let answer = false;
    const { vm, events } = make({ _confirm: async () => answer } as any);
    expect(await vm.edit.resizeGrid(5, 8)).toBe(false);
    expect(vm.model.rows).toBe(6);
    expect(events.change).toBeUndefined();
    answer = true;
    expect(await vm.edit.resizeGrid(5, 8)).toBe(true);
    expect(vm.model.slots['610']).toBeUndefined();
    expect(events.change).toHaveLength(1);
  });

  it('resize without affected slots does not ask', async () => {
    let asked = 0;
    const { vm } = make({ _confirm: async () => { asked++; return true; } } as any);
    vm.edit.clearSlot('610');
    await vm.edit.resizeGrid(5, 9);
    expect(vm.model).toMatchObject({ rows: 5, cols: 9 });
    expect(asked).toBe(0);
  });

  it('undo/redo editor changes', () => {
    const { vm, events } = make();
    vm.edit.setSlot('101', { itemType: 'cola', price: 5000, stock: 3 });
    expect(vm.model.slots['101']).toBeDefined();
    vm.edit.undo();
    expect(vm.model.slots['101']).toBeUndefined();
    vm.edit.redo();
    expect(vm.model.slots['101']).toBeDefined();
    expect(events.change).toHaveLength(3);
  });

  it('newMachine creates an empty grid', () => {
    const { vm } = make();
    vm.edit.newMachine(4, 6);
    expect(vm.model).toMatchObject({ rows: 4, cols: 6, slots: {} });
  });

  it('load during a held dispense unlocks and resets', () => {
    const { vm, events } = make({ _holdDispense: true } as any);
    vm.setMode('play');
    buy(vm, '203', 20000);
    vm.insertMoney(5000);
    expect(events.balance.at(-1)).toBe(0); // locked: money refused
    vm.load(XML);
    expect(vm.insertMoney(5000)).toBe(true);
    vm.setMode('edit'); vm.setMode('play');
    expect(vm.insertMoney(1000)).toBe(true);
  });

  it('setMode during held dispense unlocks', () => {
    const { vm } = make({ _holdDispense: true } as any);
    vm.setMode('play');
    buy(vm, '203', 20000);
    vm.setMode('edit');
    vm.setMode('play');
    expect(vm.insertMoney(1000)).toBe(true);
  });

  it('press keys route to vend state', () => {
    const { vm, events } = make();
    vm.setMode('play');
    vm.insertMoney(15000);
    for (const k of ['2', '0', '3', 'OK'] as const) vm.press(k);
    expect(events.purchase).toHaveLength(1);
  });

  it('play actions are ignored in edit mode', () => {
    const { vm, events } = make();
    expect(vm.insertMoney(1000)).toBe(false);
    vm.select('203');
    expect(events.purchase).toBeUndefined();
  });

  it('modechange emitted', () => {
    const { vm, events } = make();
    vm.setMode('play');
    vm.setMode('play');
    expect(events.modechange).toEqual(['play']);
  });

  it('dispose is idempotent and makes methods no-ops', () => {
    const { vm } = make();
    vm.dispose();
    expect(() => vm.dispose()).not.toThrow();
    expect(() => vm.setMode('play')).not.toThrow();
    expect(vm.insertMoney(1000)).toBe(false);
  });

  it('default machine when no xml given', () => {
    const el = document.createElement('div');
    const vm = createVendingMachine(el, { headless: true });
    expect(vm.model).toMatchObject({ rows: 6, cols: 10 });
  });
});

describe('review fixes', () => {
  it('#2 undo after a persisted sale keeps the sold stock', () => {
    const { vm } = make({ persistSales: true });
    vm.edit.setSlot('101', { itemType: 'cola', price: 1000, stock: 2 });
    vm.setMode('play');
    buy(vm, '203', 15000);
    vm.setMode('edit');
    vm.edit.undo(); // undoes the setSlot('101'), not the sale
    expect(vm.model.slots['101']).toBeUndefined();
    expect(vm.model.slots['203'].stock).toBe(5);
    vm.edit.redo();
    expect(vm.model.slots['101']).toBeDefined();
    expect(vm.model.slots['203'].stock).toBe(5);
  });

  it('#2 a sale does not create an undo step', () => {
    const { vm } = make({ persistSales: true });
    vm.setMode('play');
    buy(vm, '203', 15000);
    expect(vm.canUndo).toBe(false);
  });

  it('#3 a throwing purchase/change listener does not lock the machine', () => {
    const { vm } = make({ allowEdit: false });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vm.on('purchase', () => { throw new Error('host bug'); });
    vm.on('change', () => { throw new Error('db down'); });
    let second = 0;
    vm.on('purchase', () => second++);
    expect(() => buy(vm, '203', 15000)).not.toThrow();
    expect(second).toBe(1);
    expect(vm.insertMoney(1000)).toBe(true);
    spy.mockRestore();
  });
});
