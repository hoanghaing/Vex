import { parseXML, serializeXML, VendingXMLError } from '../src/model/xml';
import { DEFAULT_MODEL } from '../src/model/defaults';
import { slotItemPosition } from '../src/model/grid';
import type { MachineModel } from '../src/model/types';

function sample(): MachineModel {
  const m = DEFAULT_MODEL();
  m.name = 'Máy sảnh A';
  m.itemTypes = [
    { id: 'cola', name: 'Cola', shape: 'can', color: '#d40000', labelText: 'COLA', labelColor: '#ffffff' },
    { id: 'water', name: 'Nước suối', shape: 'bottle', color: '#cfe8ff', labelText: 'AQUA', labelColor: '#0055aa', accentColor: '#ffffff', height: 18 },
  ];
  m.slots = {
    '101': { code: '101', itemType: 'cola', price: 15000, stock: 6 },
    '203': { code: '203', itemType: 'water', price: 10000, stock: 8 },
    '610': { code: '610', itemType: 'cola', price: 0, stock: 0 },
  };
  return m;
}

const wrap = (inner: string, attrs = 'rows="6" cols="10" capacity="8"') =>
  `<?xml version="1.0"?><vendingMachine version="1" name="x" ${attrs}>
   <itemTypes><itemType id="cola" name="Cola" shape="can" color="#f00" labelText="C" labelColor="#fff"/></itemTypes>
   <slots>${inner}</slots></vendingMachine>`;

describe('XML', () => {
  it('round-trips a model', () => {
    const m = sample();
    expect(parseXML(serializeXML(m)).model).toEqual(m);
  });

  it('escapes special characters and keeps unicode', () => {
    const m = sample();
    m.itemTypes[0].name = 'Tôm & Cua <"đặc biệt"> 🍤';
    m.name = "O'Neil & co";
    const back = parseXML(serializeXML(m)).model;
    expect(back.itemTypes[0].name).toBe('Tôm & Cua <"đặc biệt"> 🍤');
    expect(back.name).toBe("O'Neil & co");
  });

  it('drops slots outside the grid with a warning', () => {
    const r = parseXML(wrap('<slot code="711" itemType="cola" price="1" stock="1"/>'));
    expect(r.model.slots['711']).toBeUndefined();
    expect(r.warnings.join()).toContain('711');
  });

  it('drops slots with unknown itemType with a warning', () => {
    const r = parseXML(wrap('<slot code="101" itemType="ghost" price="1" stock="1"/>'));
    expect(r.model.slots['101']).toBeUndefined();
    expect(r.warnings.join()).toContain('ghost');
  });

  it('clamps stock, price and grid', () => {
    const r = parseXML(wrap(
      '<slot code="101" itemType="cola" price="-5" stock="99"/>' +
      '<slot code="102" itemType="cola" price="12.7" stock="-1"/>', 'rows="9" cols="10" capacity="8"'));
    expect(r.model.rows).toBe(6);
    expect(r.model.slots['101']).toMatchObject({ stock: 8, price: 0 });
    expect(r.model.slots['102']).toMatchObject({ stock: 0, price: 12 });
    expect(r.warnings.length).toBeGreaterThanOrEqual(3);
  });

  it('ignores position on load and writes computed position', () => {
    const r = parseXML(wrap('<slot code="203" itemType="cola" price="1" stock="1"><position x="99" y="99" z="99"/></slot>'));
    expect(r.model.slots['203']).toEqual({ code: '203', itemType: 'cola', price: 1, stock: 1 });
    const xml = serializeXML(r.model);
    const p = slotItemPosition(r.model, 2, 3, 0);
    expect(xml).toContain(`<position x="${+p.x.toFixed(3)}" y="${+p.y.toFixed(3)}" z="${+p.z.toFixed(3)}"/>`);
  });

  it('throws VendingXMLError on malformed or wrong root', () => {
    expect(() => parseXML('<oops')).toThrow(VendingXMLError);
    expect(() => parseXML('<foo/>')).toThrow(VendingXMLError);
  });

  it('preserves model and unknown attributes on itemType', () => {
    const r = parseXML(wrap('').replace('labelColor="#fff"', 'labelColor="#fff" model="a.glb" foo="bar"'));
    const t = parseXML(serializeXML(r.model)).model.itemTypes[0];
    expect(t.model).toBe('a.glb');
    expect(t.extra).toEqual({ foo: 'bar' });
  });

  it('tolerates BOM and leading whitespace', () => {
    expect(() => parseXML('﻿\n  ' + wrap(''))).not.toThrow();
  });

  it('uses defaults when theme or itemTypes are missing', () => {
    const r = parseXML('<vendingMachine version="1" rows="5" cols="8"/>');
    expect(r.model.theme).toEqual(DEFAULT_MODEL().theme);
    expect(r.model.itemTypes).toEqual([]);
    expect(r.model.capacity).toBe(8);
  });
});

describe('XML whitespace and control characters (review #4)', () => {
  it('round-trips newline, carriage return and tab in attributes', () => {
    const m = sample();
    m.name = 'Dòng 1\nDòng 2\tTab\r';
    m.itemTypes[0].labelText = 'A\nB';
    const back = parseXML(serializeXML(m)).model;
    expect(back.name).toBe('Dòng 1\nDòng 2\tTab\r');
    expect(back.itemTypes[0].labelText).toBe('A\nB');
  });

  it('strips characters XML 1.0 cannot represent so output stays loadable', () => {
    const m = sample();
    m.name = 'bad\u0001name￾';
    const xml = serializeXML(m);
    expect(() => parseXML(xml)).not.toThrow();
    expect(parseXML(xml).model.name).toBe('badname');
  });
});
