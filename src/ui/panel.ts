import { h } from './dom';

const store = {
  get(k: string): string | null {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string): void {
    try { localStorage.setItem(k, v); } catch { /* ignore */ }
  },
};

export interface Panel { el: HTMLDivElement; body: HTMLDivElement; head: HTMLDivElement; setTitle(t: string): void }

/** Floating, collapsible panel. Collapsed state is remembered per id (best effort). */
export function panel(id: string, title: string, cls: string, opts: { collapsible?: boolean; extraHead?: Node[] } = {}): Panel {
  const titleEl = h('span', {}, title);
  const chev = h('span', { class: 'vm3d-chev', 'aria-hidden': 'true' }, '▾');
  const head = h('div', { class: 'vm3d-panel-head' }, titleEl, ...(opts.extraHead ?? []), opts.collapsible === false ? null : chev);
  const body = h('div', { class: 'vm3d-panel-body' });
  const el = h('div', { class: `vm3d-panel ${cls}`, 'data-panel': id }, head, body);
  if (opts.collapsible !== false) {
    const key = `vm3d:collapsed:${id}`;
    if (store.get(key) === '1') el.classList.add('collapsed');
    head.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      el.classList.toggle('collapsed');
      store.set(key, el.classList.contains('collapsed') ? '1' : '0');
    });
  }
  // keep pointer/keyboard events from reaching the 3D canvas / machine shortcuts
  for (const ev of ['pointerdown', 'wheel', 'keydown']) el.addEventListener(ev, (e) => e.stopPropagation());
  return { el, body, head, setTitle: (t) => (titleEl.textContent = t) };
}

export function field(label: string, input: HTMLElement): HTMLLabelElement {
  return h('label', { class: 'vm3d-field' }, h('span', {}, label), input);
}
