import { h, option } from './dom';
import { LIMITS } from '../model/defaults';
import { ensureStyles } from './styles';

interface DialogBase { title: string; okText: string; cancelText: string }

function openDialog<T>(root: HTMLElement, title: string, body: Node[], okText: string, cancelText: string, onOk: () => T, cancelValue: T): Promise<T> {
  ensureStyles();
  return new Promise<T>((resolve) => {
    const close = (v: T) => {
      overlay.remove();
      resolve(v);
    };
    const ok = h('button', { class: 'vm3d-btn vm3d-btn-primary', type: 'button', onclick: () => close(onOk()) }, okText);
    const cancel = h('button', { class: 'vm3d-btn', type: 'button', onclick: () => close(cancelValue) }, cancelText);
    const dialog = h('div', { class: 'vm3d-dialog', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' },
      h('div', { class: 'vm3d-dialog-title' }, title),
      ...body,
      h('div', { class: 'vm3d-dialog-actions' }, cancel, ok),
    );
    const overlay = h('div', { class: 'vm3d-overlay', onclick: (e: MouseEvent) => e.target === overlay && close(cancelValue) }, dialog);
    dialog.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') close(cancelValue);
      else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') close(onOk());
    });
    root.appendChild(overlay);
    ok.focus();
  });
}

export function confirmDialog(root: HTMLElement, o: DialogBase & { message: string; list?: string[] }): Promise<boolean> {
  const body: Node[] = [h('p', { class: 'vm3d-dialog-msg' }, o.message)];
  if (o.list?.length) body.push(h('div', { class: 'vm3d-codes' }, ...o.list.map((c) => h('span', { class: 'vm3d-code' }, c))));
  return openDialog(root, o.title, body, o.okText, o.cancelText, () => true, false);
}

export function newMachineDialog(root: HTMLElement, o: DialogBase & { rows: string; cols: string }): Promise<{ rows: number; cols: number } | null> {
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const rows = h('select', { class: 'vm3d-input' }, ...range(LIMITS.rows[0], LIMITS.rows[1]).map((n) => option(String(n), String(n), n === 6)));
  const cols = h('select', { class: 'vm3d-input' }, ...range(LIMITS.cols[0], LIMITS.cols[1]).map((n) => option(String(n), String(n), n === 10)));
  const body = [
    h('label', { class: 'vm3d-field' }, h('span', {}, o.rows), rows),
    h('label', { class: 'vm3d-field' }, h('span', {}, o.cols), cols),
  ];
  return openDialog(root, o.title, body, o.okText, o.cancelText, () => ({ rows: Number(rows.value), cols: Number(cols.value) }), null);
}
