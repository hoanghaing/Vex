import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { VendingMachine as VendingMachineComponent, VendingMachinePlugin } from '../src/vue/index';
import { VendingMachine } from '../src/VendingMachine';

const XML = `<vendingMachine version="1" name="T" rows="6" cols="10" capacity="8">
  <itemTypes><itemType id="cola" name="Cola" shape="can" color="#f00" labelText="C" labelColor="#fff"/></itemTypes>
  <slots><slot code="203" itemType="cola" price="15000" stock="6"/></slots></vendingMachine>`;

const mk = (props: Record<string, any> = {}) => mount(VendingMachineComponent, { props: { headless: true, xml: XML, ...props } });
const inst = (w: any): VendingMachine => w.vm.instance;

describe('Vue wrapper', () => {
  it('creates an instance from the xml prop', () => {
    const w = mk();
    expect(inst(w).model.slots['203'].stock).toBe(6);
    w.unmount();
  });

  it('emits update:xml once per edit', () => {
    const w = mk();
    inst(w).edit.setSlot('101', { itemType: 'cola', price: 1, stock: 1 });
    expect(w.emitted('update:xml')).toHaveLength(1);
    expect(w.emitted('change')).toHaveLength(1);
    w.unmount();
  });

  it('does not reload when the parent echoes back the emitted xml', async () => {
    const w = mk();
    const spy = vi.spyOn(inst(w), 'load');
    inst(w).edit.setSlot('101', { itemType: 'cola', price: 1, stock: 1 });
    const emitted = w.emitted('update:xml')![0][0] as string;
    await w.setProps({ xml: emitted });
    expect(spy).not.toHaveBeenCalled();
    w.unmount();
  });

  it('reloads when xml prop changes to something new', async () => {
    const w = mk();
    const spy = vi.spyOn(inst(w), 'load');
    await w.setProps({ xml: XML.replace('stock="6"', 'stock="2"') });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(inst(w).model.slots['203'].stock).toBe(2);
    w.unmount();
  });

  it('syncs mode both ways', async () => {
    const w = mk({ mode: 'edit' });
    inst(w).setMode('play');
    expect(w.emitted('update:mode')![0]).toEqual(['play']);
    await w.setProps({ mode: 'play' }); // parent v-model applies the emitted value
    expect(inst(w).mode).toBe('play');
    await w.setProps({ mode: 'edit' });
    expect(inst(w).mode).toBe('edit');
    w.unmount();
  });

  it('re-emits purchase events', () => {
    const w = mk({ mode: 'play' });
    inst(w).insertMoney(15000);
    inst(w).select('203');
    expect(w.emitted('purchase')![0][0]).toMatchObject({ code: '203' });
    w.unmount();
  });

  it('exposes proxy methods', () => {
    const w = mk();
    expect((w.vm as any).toXML()).toContain('<vendingMachine');
    w.unmount();
  });

  it('disposes on unmount, 20 mount/unmount cycles', () => {
    const spy = vi.spyOn(VendingMachine.prototype, 'dispose');
    for (let i = 0; i < 20; i++) mk().unmount();
    expect(spy).toHaveBeenCalledTimes(20);
    spy.mockRestore();
  });

  it('recreates the instance when a structural prop changes', async () => {
    const w = mk();
    const first = inst(w);
    await w.setProps({ allowEdit: false });
    await nextTick();
    expect(inst(w)).not.toBe(first);
    expect(first.isDisposed).toBe(true);
    expect(inst(w).mode).toBe('play');
    w.unmount();
  });

  it('plugin registers the component globally', () => {
    const app = { component: vi.fn() };
    VendingMachinePlugin.install(app as any);
    expect(app.component).toHaveBeenCalledWith('VendingMachine', VendingMachineComponent);
  });
});

import { defineComponent, h, ref } from 'vue';

describe('Vue wrapper with inline props (review #1)', () => {
  it('does not recreate the machine when the parent re-renders with equal inline props', async () => {
    let readyCount = 0;
    let machine: VendingMachine | null = null;
    const Parent = defineComponent({
      setup() {
        const xml = ref(XML);
        return () => h(VendingMachineComponent, {
          headless: true,
          xml: xml.value,
          'onUpdate:xml': (v: string) => (xml.value = v),
          denominations: [1000, 2000],
          ui: { toolbar: false },
          messages: { led: { welcome: 'HI' } },
          onReady: (vm: VendingMachine) => { readyCount++; machine = vm; },
        });
      },
    });
    const w = mount(Parent);
    await nextTick();
    machine!.edit.setSlot('101', { itemType: 'cola', price: 1, stock: 1 });
    await nextTick();
    await nextTick();
    expect(readyCount).toBe(1);
    expect(machine!.isDisposed).toBe(false);
    w.unmount();
  });

  it('still recreates when an inline prop changes by value', async () => {
    const den = ref([1000]);
    let readyCount = 0;
    const Parent = defineComponent({
      setup() {
        return () => h(VendingMachineComponent, { headless: true, xml: XML, denominations: [...den.value], onReady: () => readyCount++ });
      },
    });
    const w = mount(Parent);
    den.value = [1000, 5000];
    await nextTick();
    await nextTick();
    expect(readyCount).toBe(2);
    w.unmount();
  });
});
