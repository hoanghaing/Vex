import type { VendingMachine } from '../VendingMachine';
import { newMachineDialog } from './dialog';
import { h } from './dom';

export function createToolbar(vm: VendingMachine, root: HTMLElement, hooks: { toast(msg: string): void; toggleSettings(): void }) {
  const t = vm.messages.ui;
  const file = h('input', { type: 'file', accept: '.xml,application/xml,text/xml', style: { display: 'none' } });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    file.value = '';
    if (!f) return;
    try {
      vm.load(await f.text());
    } catch (e) {
      hooks.toast(`${t.loadError}: ${(e as Error).message}`);
    }
  });
  const btn = (label: string, title: string, onclick: () => void) => h('button', { class: 'vm3d-btn vm3d-btn-ghost', type: 'button', title, onclick }, label);
  const undo = btn('↶', t.undo, () => vm.edit.undo());
  const redo = btn('↷', t.redo, () => vm.edit.redo());
  const el = h('div', { class: 'vm3d-panel vm3d-toolbar', role: 'toolbar' },
    btn(t.newMachine, t.newMachineTitle, async () => {
      const r = await newMachineDialog(root, { title: t.newMachineTitle, rows: t.rows, cols: t.cols, okText: t.ok, cancelText: t.cancel });
      if (r) vm.edit.newMachine(r.rows, r.cols);
    }),
    btn(t.open, t.open, () => file.click()),
    btn(t.download, t.download, () => vm.download(`${slug(vm.model.name) || 'machine'}.xml`)),
    btn('⚙', t.settings, () => hooks.toggleSettings()),
    undo,
    redo,
    file,
  );
  for (const ev of ['pointerdown', 'wheel', 'keydown']) el.addEventListener(ev, (e) => e.stopPropagation());
  root.appendChild(el);

  // fade when idle
  let timer = 0;
  const wake = () => {
    el.classList.remove('idle');
    clearTimeout(timer);
    timer = window.setTimeout(() => el.classList.add('idle'), 3000);
  };
  root.addEventListener('pointermove', wake);
  wake();

  return {
    el,
    update() {
      undo.disabled = !vm.canUndo;
      redo.disabled = !vm.canRedo;
    },
    dispose() {
      clearTimeout(timer);
      root.removeEventListener('pointermove', wake);
    },
  };
}

function slug(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}
