import type { VendingMachine } from '../VendingMachine';
import { SHAPES, type ItemType, type Shape } from '../model/types';
import { h, option } from './dom';
import { field, panel } from './panel';

const PALETTE = ['#d40000', '#2fbf4a', '#1e88e5', '#ff9800', '#8e24aa', '#00897b', '#6d4c41', '#fdd835', '#e91e63', '#546e7a'];

export function createItemTypePanel(vm: VendingMachine, root: HTMLElement) {
  const t = vm.messages.ui;
  const addBtn = h('button', { class: 'vm3d-btn vm3d-btn-ghost', type: 'button', title: t.addItemType }, '+');
  const p = panel('types', t.itemTypes, 'vm3d-side2', { extraHead: [addBtn] });
  const list = h('div', { class: 'vm3d-types' });
  const form = h('div', {});
  p.body.append(list, form);
  root.appendChild(p.el);
  let selected: string | null = null;

  addBtn.addEventListener('click', () => {
    const n = vm.model.itemTypes.length;
    const id = uniqueId(vm);
    const color = PALETTE[n % PALETTE.length];
    vm.edit.upsertItemType({ id, name: `${t.itemType} ${n + 1}`, shape: SHAPES[n % 4] as Shape, color, labelText: `ITEM${n + 1}`, labelColor: '#ffffff' });
    selected = id;
    p.el.classList.remove('collapsed');
    update();
  });

  function renderForm(it: ItemType) {
    const name = h('input', { class: 'vm3d-input', value: it.name });
    const shape = h('select', { class: 'vm3d-input' }, ...SHAPES.map((s) => option(s, t['shape_' + s] ?? s, s === it.shape)));
    const color = h('input', { class: 'vm3d-input', type: 'color', value: toHex(it.color) });
    const labelText = h('input', { class: 'vm3d-input', value: it.labelText, maxlength: '14' });
    const labelColor = h('input', { class: 'vm3d-input', type: 'color', value: toHex(it.labelColor) });
    const accent = h('input', { class: 'vm3d-input', type: 'color', value: toHex(it.accentColor ?? it.labelColor) });
    const save = () =>
      vm.edit.upsertItemType({
        ...it,
        name: name.value.trim() || it.id,
        shape: shape.value as Shape,
        color: color.value,
        labelText: labelText.value,
        labelColor: labelColor.value,
        accentColor: accent.value,
      });
    for (const el of [name, shape, color, labelText, labelColor, accent]) el.addEventListener('change', save);
    const del = h('button', { class: 'vm3d-btn vm3d-btn-danger', type: 'button', onclick: async () => {
      if (await vm.edit.removeItemType(it.id)) selected = null;
      update();
    } }, t.delete);
    form.replaceChildren(
      h('hr', { style: { border: '0', borderTop: '1px solid var(--vm3d-border)', margin: '8px 0' } }),
      field(t.name, name),
      field(t.shape, shape),
      h('div', { class: 'vm3d-row' }, field(t.color, color), field(t.accentColor, accent)),
      h('div', { class: 'vm3d-row' }, field(t.labelText, labelText), field(t.labelColor, labelColor)),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '6px' } }, del),
    );
  }

  function update() {
    const types = vm.model.itemTypes;
    if (selected && !types.some((x) => x.id === selected)) selected = null;
    list.replaceChildren(
      ...types.map((it) =>
        h('div', { class: `vm3d-type${it.id === selected ? ' sel' : ''}`, onclick: () => { selected = selected === it.id ? null : it.id; update(); } },
          h('span', { class: 'vm3d-swatch', style: { background: it.color } }, (t['shape_' + it.shape] ?? it.shape)[0]),
          h('span', { class: 'vm3d-type-name' }, it.name),
          h('span', { class: 'vm3d-type-shape' }, it.labelText),
        ),
      ),
    );
    const cur = types.find((x) => x.id === selected);
    if (cur) renderForm(cur);
    else form.replaceChildren();
  }

  update();
  return { el: p.el, update };
}

function uniqueId(vm: VendingMachine): string {
  let i = vm.model.itemTypes.length + 1;
  while (vm.model.itemTypes.some((x) => x.id === `item${i}`)) i++;
  return `item${i}`;
}

/** <input type=color> only accepts #rrggbb. */
export function toHex(c: string): string {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
  return '#cccccc';
}
