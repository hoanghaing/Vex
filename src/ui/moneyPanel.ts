import type { VendingMachine } from '../VendingMachine';
import { h } from './dom';
import { panel } from './panel';

export function createMoneyPanel(vm: VendingMachine, root: HTMLElement) {
  const t = vm.messages.ui;
  const p = panel('money', t.insert, 'vm3d-money');
  const balance = h('div', { class: 'vm3d-balance', 'aria-live': 'polite' });
  const bills = h('div', { class: 'vm3d-bills' },
    ...vm.options.denominations.map((v) =>
      h('button', { class: 'vm3d-btn', type: 'button', onclick: () => vm.insertMoney(v) }, vm.format(v)),
    ),
  );
  const refund = h('button', { class: 'vm3d-btn vm3d-btn-danger', type: 'button', style: { width: '100%', marginTop: '8px' }, onclick: () => vm.refund() }, t.refund);
  const hint = h('div', { class: 'vm3d-hint' }, '0–9 · Enter = OK · Backspace = C');
  p.body.append(balance, bills, refund, hint);
  root.appendChild(p.el);

  const update = () => {
    balance.textContent = vm.format(vm.balance);
    const locked = vm.isDispensing;
    for (const b of bills.querySelectorAll('button')) b.disabled = locked;
    refund.disabled = locked || vm.balance === 0;
  };
  const offs = [vm.on('balance', update), vm.on('purchase', update)];
  update();
  return {
    el: p.el,
    update,
    setVisible(v: boolean) { p.el.style.display = v ? '' : 'none'; },
    dispose() { offs.forEach((f) => f()); },
  };
}
