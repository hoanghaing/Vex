import * as THREE from 'three';
import type { ConfirmRequest, Mode, Presenter, VendingMachine } from './VendingMachine';
import type { MachineModel } from './model/types';
import { AnimationQueue, type Tween, easing, tween } from './three/anim';
import { playDispense } from './three/dispense';
import { SceneHost } from './three/scene';
import { type CameraPose, MachineView } from './three/view';

/** WebGL + DOM presenter. */
export function createPresenter(vm: VendingMachine, container: HTMLElement): Presenter {
  const host = new SceneHost(container);
  const view = new MachineView(host);
  const queue = new AnimationQueue();
  let lastLed = '';
  let camTween: Tween | null = null;

  view.moveCamera = (pose: CameraPose) => {
    camTween?.cancel();
    const p0 = host.camera.position.clone();
    const t0 = host.controls.target.clone();
    const p = new THREE.Vector3(), t = new THREE.Vector3();
    camTween = tween(host, 0.6, (k) => {
      host.camera.position.copy(p.copy(p0).lerp(pose.position, k));
      host.controls.target.copy(t.copy(t0).lerp(pose.target, k));
    }, easing.easeInOutCubic);
    return camTween.promise;
  };

  return {
    render(model: MachineModel, _mode: Mode) {
      view.setModel(model);
      view.body?.led.set(lastLed);
    },
    dispense(code: string) {
      const model = vm.activeModel;
      return queue.run(async (signal) => {
        await playDispense(host, view, model, code, signal);
      });
    },
    cancelAnimations() {
      queue.cancelAll();
      view.clearTray();
    },
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
      queue.cancelAll();
      camTween?.cancel();
      view.dispose();
      host.dispose();
    },
  };
}
