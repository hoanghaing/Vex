import type { VendingMachine } from '../VendingMachine';
import { h } from './dom';

export function createModeToggle(vm: VendingMachine, root: HTMLElement) {
  const t = vm.messages.ui;
  const edit = h('button', { class: 'vm3d-btn', type: 'button', title: 'Tab', onclick: () => vm.setMode('edit') }, `✎ ${t.edit}`);
  const play = h('button', { class: 'vm3d-btn', type: 'button', title: 'Tab', onclick: () => vm.setMode('play') }, `▶ ${t.play}`);
  const el = h('div', { class: 'vm3d-panel vm3d-mode' }, edit, play);
  for (const ev of ['pointerdown', 'wheel']) el.addEventListener(ev, (e) => e.stopPropagation());
  root.appendChild(el);
  return {
    el,
    update() {
      edit.classList.toggle('active', vm.mode === 'edit');
      play.classList.toggle('active', vm.mode === 'play');
    },
  };
}
