import type { VendingMachine } from '../VendingMachine';
import { LIMITS } from '../model/defaults';
import { h, option } from './dom';
import { toHex } from './itemTypePanel';
import { field, panel } from './panel';

export function createSettingsPanel(vm: VendingMachine, root: HTMLElement) {
  const t = vm.messages.ui;
  const p = panel('settings', t.settings, 'vm3d-side');
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const name = h('input', { class: 'vm3d-input' });
  const rows = h('select', { class: 'vm3d-input' }, ...range(LIMITS.rows[0], LIMITS.rows[1]).map((n) => option(String(n), String(n))));
  const cols = h('select', { class: 'vm3d-input' }, ...range(LIMITS.cols[0], LIMITS.cols[1]).map((n) => option(String(n), String(n))));
  const cap = h('select', { class: 'vm3d-input' }, ...range(LIMITS.capacity[0], LIMITS.capacity[1]).map((n) => option(String(n), String(n))));
  const body = h('input', { class: 'vm3d-input', type: 'color' });
  const accent = h('input', { class: 'vm3d-input', type: 'color' });
  const glass = h('input', { class: 'vm3d-input', type: 'range', min: '0', max: '0.8', step: '0.05' });
  p.body.append(
    field(t.machineName, name),
    h('div', { class: 'vm3d-row' }, field(t.rows, rows), field(t.cols, cols)),
    field(t.capacity, cap),
    h('div', { class: 'vm3d-row' }, field(t.bodyColor, body), field(t.accentColor, accent)),
    field(t.glass, glass),
  );
  p.el.style.display = 'none'; // opened from the toolbar
  root.appendChild(p.el);

  name.addEventListener('change', () => vm.edit.setMeta({ name: name.value }));
  const resize = async () => {
    await vm.edit.resizeGrid(Number(rows.value), Number(cols.value));
    update(); // revert selects if cancelled
  };
  rows.addEventListener('change', resize);
  cols.addEventListener('change', resize);
  cap.addEventListener('change', async () => {
    await vm.edit.setCapacity(Number(cap.value));
    update();
  });
  body.addEventListener('change', () => vm.edit.setMeta({ theme: { body: body.value } }));
  accent.addEventListener('change', () => vm.edit.setMeta({ theme: { accent: accent.value } }));
  glass.addEventListener('change', () => vm.edit.setMeta({ theme: { glassOpacity: Number(glass.value) } }));

  function update() {
    const m = vm.model;
    if (document.activeElement !== name) name.value = m.name;
    rows.value = String(m.rows);
    cols.value = String(m.cols);
    cap.value = String(m.capacity);
    body.value = toHex(m.theme.body);
    accent.value = toHex(m.theme.accent);
    glass.value = String(m.theme.glassOpacity);
  }
  update();
  return {
    el: p.el,
    update,
    toggle() {
      const hidden = p.el.style.display === 'none';
      p.el.style.display = hidden ? '' : 'none';
      if (hidden) p.el.classList.remove('collapsed');
    },
  };
}
