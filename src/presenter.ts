import type { ConfirmRequest, Mode, Presenter, VendingMachine } from './VendingMachine';
import type { MachineModel } from './model/types';
import { SceneHost } from './three/scene';
import { MachineView } from './three/view';

/** WebGL + DOM presenter. */
export function createPresenter(vm: VendingMachine, container: HTMLElement): Presenter {
  const host = new SceneHost(container);
  const view = new MachineView(host);
  let lastLed = '';

  return {
    render(model: MachineModel, _mode: Mode) {
      view.setModel(model);
      view.body?.led.set(lastLed);
    },
    dispense(_code: string) {
      return Promise.resolve().then(() => view.setModel(vm.activeModel));
    },
    cancelAnimations() {},
    led(text: string) {
      lastLed = text;
      view.body?.led.set(text);
      host.requestRender();
    },
    confirm(_req: ConfirmRequest) {
      return Promise.resolve(true);
    },
    toast(msg: string) {
      console.warn('[vending-machine-3d]', msg);
    },
    dispose() {
      view.dispose();
      host.dispose();
    },
  };
}
