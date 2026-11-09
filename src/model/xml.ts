import { DEFAULT_MODEL, LIMITS } from './defaults';
import { clampGrid, parseCode, slotItemPosition } from './grid';
import type { ItemType, MachineModel, Shape, Slot } from './types';
import { SHAPES } from './types';

export class VendingXMLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VendingXMLError';
  }
}

const ITEM_ATTRS = ['id', 'name', 'shape', 'color', 'labelText', 'labelColor', 'accentColor', 'width', 'height', 'depth', 'model'];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attr = (name: string, value: unknown) =>
  value === undefined || value === null || value === '' ? '' : ` ${name}="${esc(String(value))}"`;

export function parseXML(xml: string): { model: MachineModel; warnings: string[] } {
  const warnings: string[] = [];
  const text = String(xml ?? '').replace(/^﻿/, '').trim();
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new VendingXMLError('Malformed XML: ' + (doc.getElementsByTagName('parsererror')[0].textContent ?? '').trim().slice(0, 200));
  }
  const root = doc.documentElement;
  if (!root || root.nodeName !== 'vendingMachine') {
    throw new VendingXMLError(`Root element must be <vendingMachine>, got <${root?.nodeName ?? 'none'}>`);
  }

  const m = DEFAULT_MODEL();
  m.name = root.getAttribute('name') ?? m.name;

  const grid = clampGrid(num(root, 'rows', m.rows), num(root, 'cols', m.cols));
  m.rows = grid.rows;
  m.cols = grid.cols;
  warnings.push(...grid.warnings);

  const capRaw = num(root, 'capacity', m.capacity);
  m.capacity = Math.min(LIMITS.capacity[1], Math.max(LIMITS.capacity[0], Math.round(capRaw)));
  if (m.capacity !== capRaw) warnings.push(`capacity=${capRaw} clamped to ${m.capacity}`);

  const theme = child(root, 'theme');
  if (theme) {
    m.theme.body = theme.getAttribute('body') ?? m.theme.body;
    m.theme.accent = theme.getAttribute('accent') ?? m.theme.accent;
    const g = Number(theme.getAttribute('glassOpacity'));
    if (theme.hasAttribute('glassOpacity') && Number.isFinite(g)) m.theme.glassOpacity = Math.min(1, Math.max(0, g));
  }

  const types = child(root, 'itemTypes');
  if (types) {
    for (const el of children(types, 'itemType')) {
      const t = parseItemType(el, warnings);
      if (!t) continue;
      if (m.itemTypes.some((x) => x.id === t.id)) {
        warnings.push(`duplicate itemType id "${t.id}" ignored`);
        continue;
      }
      m.itemTypes.push(t);
    }
  }

  const slots = child(root, 'slots');
  if (slots) {
    for (const el of children(slots, 'slot')) {
      const code = el.getAttribute('code') ?? '';
      if (!parseCode(code, m.rows, m.cols)) {
        warnings.push(`slot code "${code}" is invalid for a ${m.rows}x${m.cols} grid, ignored`);
        continue;
      }
      const itemType = el.getAttribute('itemType') ?? '';
      if (!m.itemTypes.some((t) => t.id === itemType)) {
        warnings.push(`slot ${code}: unknown itemType "${itemType}", ignored`);
        continue;
      }
      const priceRaw = num(el, 'price', 0);
      const price = Math.max(0, Math.floor(priceRaw));
      if (price !== priceRaw) warnings.push(`slot ${code}: price ${priceRaw} adjusted to ${price}`);
      const stockRaw = num(el, 'stock', 0);
      const stock = Math.min(m.capacity, Math.max(0, Math.floor(stockRaw)));
      if (stock !== stockRaw) warnings.push(`slot ${code}: stock ${stockRaw} clamped to ${stock}`);
      m.slots[code] = { code, itemType, price, stock };
    }
  }

  return { model: m, warnings };
}

function parseItemType(el: Element, warnings: string[]): ItemType | null {
  const id = el.getAttribute('id');
  if (!id) {
    warnings.push('itemType without id ignored');
    return null;
  }
  let shape = el.getAttribute('shape') as Shape;
  if (!SHAPES.includes(shape)) {
    warnings.push(`itemType ${id}: unknown shape "${shape}", using "can"`);
    shape = 'can';
  }
  const t: ItemType = {
    id,
    name: el.getAttribute('name') ?? id,
    shape,
    color: el.getAttribute('color') ?? '#cccccc',
    labelText: el.getAttribute('labelText') ?? '',
    labelColor: el.getAttribute('labelColor') ?? '#ffffff',
  };
  const accent = el.getAttribute('accentColor');
  if (accent) t.accentColor = accent;
  for (const k of ['width', 'height', 'depth'] as const) {
    if (el.hasAttribute(k)) {
      const v = Number(el.getAttribute(k));
      if (Number.isFinite(v) && v > 0) t[k] = v;
      else warnings.push(`itemType ${id}: invalid ${k}, ignored`);
    }
  }
  const model = el.getAttribute('model');
  if (model) t.model = model;
  const extra: Record<string, string> = {};
  for (const a of Array.from(el.attributes)) if (!ITEM_ATTRS.includes(a.name)) extra[a.name] = a.value;
  if (Object.keys(extra).length) t.extra = extra;
  return t;
}

export function serializeXML(m: MachineModel): string {
  const L: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  L.push(`<vendingMachine version="1"${attr('name', m.name)} rows="${m.rows}" cols="${m.cols}" capacity="${m.capacity}">`);
  L.push(`  <theme${attr('body', m.theme.body)}${attr('accent', m.theme.accent)} glassOpacity="${m.theme.glassOpacity}"/>`);
  L.push('  <itemTypes>');
  for (const t of m.itemTypes) {
    let s = `    <itemType${attr('id', t.id)}${attr('name', t.name)}${attr('shape', t.shape)}${attr('color', t.color)}` +
      `${attr('labelText', t.labelText)}${attr('labelColor', t.labelColor)}${attr('accentColor', t.accentColor)}` +
      `${attr('width', t.width)}${attr('height', t.height)}${attr('depth', t.depth)}${attr('model', t.model)}`;
    for (const [k, v] of Object.entries(t.extra ?? {})) s += attr(k, v);
    L.push(s + '/>');
  }
  L.push('  </itemTypes>');
  L.push('  <slots>');
  const slots = Object.values(m.slots).sort((a, b) => a.code.localeCompare(b.code));
  for (const s of slots) L.push(slotXML(m, s));
  L.push('  </slots>');
  L.push('</vendingMachine>');
  return L.join('\n') + '\n';
}

function slotXML(m: MachineModel, s: Slot): string {
  const rc = parseCode(s.code, m.rows, m.cols);
  const head = `    <slot code="${s.code}"${attr('itemType', s.itemType)} price="${s.price}" stock="${s.stock}"`;
  if (!rc) return head + '/>';
  const p = slotItemPosition(m, rc.row, rc.col, 0);
  const r = (v: number) => +v.toFixed(3);
  return `${head}>\n      <position x="${r(p.x)}" y="${r(p.y)}" z="${r(p.z)}"/>\n    </slot>`;
}

function num(el: Element, name: string, fallback: number): number {
  if (!el.hasAttribute(name)) return fallback;
  const v = Number(el.getAttribute(name));
  return Number.isFinite(v) ? v : fallback;
}

function child(el: Element, name: string): Element | null {
  return children(el, name)[0] ?? null;
}

function children(el: Element, name: string): Element[] {
  return Array.from(el.children).filter((c) => c.nodeName === name);
}

