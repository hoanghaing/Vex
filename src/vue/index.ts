import { type App, type PropType, defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { createVendingMachine } from '../index';
import type { Mode, PurchaseEvent, UIOptions, VendingMachine as Machine, VendingOptions } from '../VendingMachine';
import type { MoneyFormat } from '../core/messages';
import type { VendKey } from '../vend/machine';

/**
 * <VendingMachine v-model:xml="xml" v-model:mode="mode" />
 * Thin wrapper: mounts the core machine into a div and forwards events.
 */
export const VendingMachine = defineComponent({
  name: 'VendingMachine',
  props: {
    xml: { type: String, default: undefined },
    mode: { type: String as PropType<Mode>, default: undefined },
    allowEdit: { type: Boolean, default: true },
    persistSales: { type: Boolean, default: undefined },
    denominations: { type: Array as PropType<number[]>, default: undefined },
    currency: { type: Object as PropType<{ code: string; format: MoneyFormat }>, default: undefined },
    ui: { type: Object as PropType<UIOptions>, default: undefined },
    messages: { type: Object as PropType<VendingOptions['messages']>, default: undefined },
    /** Testing: no WebGL. */
    headless: { type: Boolean, default: false },
  },
  emits: {
    'update:xml': (_xml: string) => true,
    'update:mode': (_m: Mode) => true,
    change: (_e: { xml: string }) => true,
    purchase: (_e: PurchaseEvent) => true,
    error: (_e: { code: string; reason: string; missing?: number }) => true,
    warning: (_msg: string) => true,
    balance: (_v: number) => true,
    ready: (_vm: Machine) => true,
  },
  setup(props, { emit, expose }) {
    const el = ref<HTMLDivElement | null>(null);
    const instance = shallowRef<Machine | null>(null);
    let lastXml: string | undefined;

    function create(xml: string | undefined, mode: Mode | undefined) {
      if (!el.value) return;
      const vm = createVendingMachine(el.value, {
        xml,
        mode,
        allowEdit: props.allowEdit,
        persistSales: props.persistSales,
        denominations: props.denominations,
        currency: props.currency,
        ui: props.ui,
        messages: props.messages,
        headless: props.headless,
      });
      lastXml = xml;
      vm.on('change', (e) => {
        lastXml = e.xml;
        emit('update:xml', e.xml);
        emit('change', e);
      });
      vm.on('modechange', (m) => emit('update:mode', m));
      vm.on('purchase', (e) => emit('purchase', e));
      vm.on('error', (e) => emit('error', e));
      vm.on('warning', (w) => emit('warning', w));
      vm.on('balance', (v) => emit('balance', v));
      instance.value = vm;
      emit('ready', vm);
    }

    function destroy() {
      instance.value?.dispose();
      instance.value = null;
    }

    onMounted(() => create(props.xml, props.mode));
    onBeforeUnmount(destroy);

    watch(() => props.xml, (xml) => {
      const vm = instance.value;
      if (!vm || xml === undefined || xml === lastXml) return;
      lastXml = xml;
      try {
        vm.load(xml);
      } catch (e) {
        emit('warning', (e as Error).message);
      }
    });

    watch(() => props.mode, (m) => {
      if (m && instance.value && instance.value.mode !== m) instance.value.setMode(m);
    });

    // Recreate only when structural options change by value: inline literals in a parent
    // template (e.g. :denominations="[...]") get a new identity on every render.
    const structuralKey = () =>
      JSON.stringify([
        props.allowEdit, props.persistSales, props.denominations, props.ui, props.messages, props.headless,
        props.currency?.code, props.currency?.format ? String(props.currency.format) : null,
      ]);
    watch(structuralKey, () => {
      const vm = instance.value;
      const xml = vm ? vm.toXML() : props.xml;
      const mode = vm ? vm.mode : props.mode;
      destroy();
      create(xml, mode);
    });

    expose({
      get instance() { return instance.value; },
      toXML: () => instance.value?.toXML() ?? '',
      download: (name?: string) => instance.value?.download(name),
      load: (xml: string) => instance.value?.load(xml),
      insertMoney: (v: number) => instance.value?.insertMoney(v) ?? false,
      press: (k: VendKey) => instance.value?.press(k),
      select: (code: string) => instance.value?.select(code),
      refund: () => instance.value?.refund() ?? 0,
      setMode: (m: Mode) => instance.value?.setMode(m),
    });

    return () => h('div', { ref: el, class: 'vm3d-vue', style: { width: '100%', height: '100%', minHeight: '320px' } });
  },
});

export const VendingMachinePlugin = {
  install(app: App) {
    app.component('VendingMachine', VendingMachine);
  },
};

export default VendingMachine;
