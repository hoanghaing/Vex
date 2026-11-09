import type { VendingMachine } from '../VendingMachine';
import { parseCode, slotItemPosition } from '../model/grid';
import { h, option } from './dom';
import { field, panel } from './panel';

export interface SlotMenu {
  el: HTMLElement;
  open(code: string, at: { x: number; y: number } | null): void;
  move(at: { x: number; y: number } | null): void;
  close(): void;
  readonly code: string | null;
  update(): void;
}

export function createSlotMenu(vm: VendingMachine, root: HTMLElement, onClose: () => void): SlotMenu {
  const t = vm.messages.ui;
  const p = panel('slot', '', 'vm3d-menu', { collapsible: false, extraHead: [] });
  const closeBtn = h('button', { class: 'vm3d-btn vm3d-btn-ghost', type: 'button', 'aria-label': 'close', onclick: () => api.close() }, '✕');
  p.head.append(closeBtn);
  const typeSel = h('select', { class: 'vm3d-input' });
  const price = h('input', { class: 'vm3d-input', type: 'number', min: '0', step: '500' });
  const stock = h('input', { class: 'vm3d-input', type: 'number', min: '0', step: '1' });
  const pos = h('div', { class: 'vm3d-readonly' });
  p.body.append(field(t.itemType, typeSel), h('div', { class: 'vm3d-row' }, field(t.price, price), field(t.stock, stock)), field(t.position, pos));
  p.el.style.display = 'none';
  root.appendChild(p.el);

  let code: string | null = null;

  const apply = () => {
    if (!code) return;
    const id = typeSel.value;
    try {
      if (!id) vm.edit.clearSlot(code);
      else vm.edit.setSlot(code, { itemType: id, price: Number(price.value) || 0, stock: Number(stock.value) || 0 });
    } catch (e) {
      console.warn('[vending-machine-3d]', e);
    }
  };
  typeSel.addEventListener('change', () => {
    // choosing a type for an empty slot fills it to capacity by default
    if (code && typeSel.value && !vm.model.slots[code]) stock.value = String(vm.model.capacity);
    apply();
  });
  price.addEventListener('change', apply);
  stock.addEventListener('change', apply);
  p.el.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') api.close();
  });

  const fill = () => {
    if (!code) return;
    const m = vm.model;
    const s = m.slots[code];
    p.setTitle(`${t.slot} ${code}`);
    typeSel.replaceChildren(option('', t.empty, !s), ...m.itemTypes.map((it) => option(it.id, `${it.name} · ${t['shape_' + it.shape] ?? it.shape}`, s?.itemType === it.id)));
    price.value = String(s?.price ?? 0);
    stock.value = String(s?.stock ?? 0);
    stock.max = String(m.capacity);
    price.disabled = stock.disabled = !s;
    const rc = parseCode(code, m.rows, m.cols);
    if (rc) {
      const v = slotItemPosition(m, rc.row, rc.col, 0);
      pos.textContent = `${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}`;
    }
  };

  const api: SlotMenu = {
    el: p.el,
    get code() { return code; },
    open(c, at) {
      code = c;
      fill();
      p.el.style.display = '';
      api.move(at);
    },
    move(at) {
      if (!code) return;
      const rw = root.clientWidth, rh = root.clientHeight;
      const w = p.el.offsetWidth || 230, hgt = p.el.offsetHeight || 220;
      const x = at ? at.x + 16 : rw - w - 12;
      const y = at ? at.y - hgt / 2 : 60;
      p.el.style.left = `${Math.max(8, Math.min(rw - w - 8, x))}px`;
      p.el.style.top = `${Math.max(56, Math.min(rh - hgt - 8, y))}px`;
    },
    close() {
      if (!code) return;
      code = null;
      p.el.style.display = 'none';
      onClose();
    },
    update() {
      if (!code) return;
      if (!parseCode(code, vm.model.rows, vm.model.cols)) return api.close();
      fill();
    },
  };
  return api;
}
