import { confirmDialog, newMachineDialog } from '../src/ui/dialog';

const root = () => { const el = document.createElement('div'); document.body.appendChild(el); return el; };
const btn = (el: HTMLElement, text: string) => [...el.querySelectorAll('button')].find((b) => b.textContent === text)!;

describe('confirmDialog', () => {
  it('renders title, message and list, resolves true on OK and removes DOM', async () => {
    const el = root();
    const p = confirmDialog(el, { title: 'Thu nhỏ', message: 'Sẽ xóa:', list: ['610', '509'], okText: 'Đồng ý', cancelText: 'Hủy' });
    expect(el.textContent).toContain('Thu nhỏ');
    expect(el.textContent).toContain('610');
    expect(el.textContent).toContain('509');
    btn(el, 'Đồng ý').click();
    expect(await p).toBe(true);
    expect(el.querySelector('.vm3d-dialog')).toBeNull();
  });

  it('resolves false on cancel', async () => {
    const el = root();
    const p = confirmDialog(el, { title: 't', message: 'm', okText: 'OK', cancelText: 'Hủy' });
    btn(el, 'Hủy').click();
    expect(await p).toBe(false);
  });

  it('resolves false on Escape', async () => {
    const el = root();
    const p = confirmDialog(el, { title: 't', message: 'm', okText: 'OK', cancelText: 'Hủy' });
    el.querySelector('.vm3d-dialog')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(await p).toBe(false);
    expect(el.querySelector('.vm3d-dialog')).toBeNull();
  });
});

describe('newMachineDialog', () => {
  it('returns chosen rows/cols, defaulting to 6x10', async () => {
    const el = root();
    const p = newMachineDialog(el, { title: 'Mới', rows: 'Tầng', cols: 'Khe', okText: 'OK', cancelText: 'Hủy' });
    const [r, c] = [...el.querySelectorAll('select')] as HTMLSelectElement[];
    expect([r.value, c.value]).toEqual(['6', '10']);
    expect([...r.options].map((o) => o.value)).toEqual(['4', '5', '6']);
    expect([...c.options].map((o) => o.value)).toEqual(['6', '7', '8', '9', '10']);
    r.value = '4'; c.value = '7';
    btn(el, 'OK').click();
    expect(await p).toEqual({ rows: 4, cols: 7 });
  });

  it('returns null on cancel', async () => {
    const el = root();
    const p = newMachineDialog(el, { title: 'Mới', rows: 'Tầng', cols: 'Khe', okText: 'OK', cancelText: 'Hủy' });
    btn(el, 'Hủy').click();
    expect(await p).toBeNull();
  });
});
