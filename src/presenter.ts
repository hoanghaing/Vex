import * as THREE from 'three';
import type { ConfirmRequest, Mode, Presenter, VendingMachine } from './VendingMachine';
import type { MachineModel } from './model/types';
import { AnimationQueue, type Tween, easing, tween } from './three/anim';
import { pickUp, playDispense } from './three/dispense';
import { SceneHost } from './three/scene';
import { type CameraPose, MachineView } from './three/view';
import { confirmDialog } from './ui/dialog';
import { h } from './ui/dom';
import { createItemTypePanel } from './ui/itemTypePanel';
import { createModeToggle } from './ui/modeToggle';
import { createMoneyPanel } from './ui/moneyPanel';
import { createSettingsPanel } from './ui/settingsPanel';
import { createSlotMenu } from './ui/slotMenu';
import { ensureStyles } from './ui/styles';
import { createToolbar } from './ui/toolbar';

const isField = (el: EventTarget | null) => el instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(el.tagName);

/** WebGL + DOM presenter. */
export function createPresenter(vm: VendingMachine, container: HTMLElement): Presenter {
  ensureStyles();
  container.classList.add('vm3d-root');
  if (!container.hasAttribute('tabindex')) container.tabIndex = 0;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const host = new SceneHost(container);
  const view = new MachineView(host);
  const queue = new AnimationQueue();
  const ui = vm.options.ui ?? {};
  const t = vm.messages.ui;
  let lastLed = '';
  let camTween: Tween | null = null;
  let mode: Mode = vm.mode;
  const cleanups: (() => void)[] = [];

  view.moveCamera = (pose: CameraPose) => {
    camTween?.cancel();
    const p0 = host.camera.position.clone();
    const t0 = host.controls.target.clone();
    const p = new THREE.Vector3(), q = new THREE.Vector3();
    camTween = tween(host, 0.6, (k) => {
      host.camera.position.copy(p.copy(p0).lerp(pose.position, k));
      host.controls.target.copy(q.copy(t0).lerp(pose.target, k));
      if (slotMenu?.code) slotMenu.move(view.slotScreenPos(slotMenu.code));
    }, easing.easeInOutCubic);
    return camTween.promise;
  };

  // ---------- UI ----------
  const editEnabled = vm.options.allowEdit;
  const toast = (msg: string) => {
    const el = h('div', { class: 'vm3d-toast', role: 'status' }, msg);
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  };
  const slotMenu = editEnabled ? createSlotMenu(vm, container, () => { view.highlight(null, 'select'); void view.overview(); }) : null;
  const settings = editEnabled && ui.settingsPanel !== false ? createSettingsPanel(vm, container) : null;
  const types = editEnabled && ui.itemTypePanel !== false ? createItemTypePanel(vm, container) : null;
  const toolbar = editEnabled && ui.toolbar !== false ? createToolbar(vm, container, { toast, toggleSettings: () => settings?.toggle() }) : null;
  const modeToggle = editEnabled && ui.modeToggle !== false ? createModeToggle(vm, container) : null;
  const money = ui.moneyPanel !== false ? createMoneyPanel(vm, container) : null;
  if (toolbar) cleanups.push(toolbar.dispose);
  if (money) cleanups.push(money.dispose);
  const editEls = [slotMenu?.el, settings?.el, types?.el, toolbar?.el].filter(Boolean) as HTMLElement[];
  const settingsWasOpen = { v: false };

  function syncUI() {
    const isEdit = mode === 'edit';
    for (const el of editEls) {
      if (el === settings?.el) {
        if (!isEdit) { settingsWasOpen.v = el.style.display !== 'none'; el.style.display = 'none'; }
        else if (settingsWasOpen.v) el.style.display = '';
        continue;
      }
      if (el === slotMenu?.el) continue;
      el.style.display = isEdit ? '' : 'none';
    }
    if (!isEdit) slotMenu?.close();
    money?.setVisible(!isEdit);
    money?.update();
    settings?.update();
    types?.update();
    toolbar?.update();
    modeToggle?.update();
    slotMenu?.update();
  }

  host.controls.addEventListener('change', () => {
    if (slotMenu?.code && !camTween) slotMenu.move(view.slotScreenPos(slotMenu.code));
  });

  // ---------- picking ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const canvas = host.renderer.domElement;
  const pickAt = (e: PointerEvent, objects: THREE.Object3D[]) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, host.camera);
    return raycaster.intersectObjects(objects, true)[0]?.object ?? null;
  };
  let hovered: string | null = null;
  const onMove = (e: PointerEvent) => {
    if (!view.body || e.buttons) return;
    if (mode === 'edit') {
      const hit = pickAt(e, [...view.body.pick.slots.keys()]);
      const code = hit ? view.body.pick.slots.get(hit) ?? null : null;
      if (code !== hovered) {
        hovered = code;
        view.highlight(code, 'hover');
        canvas.style.cursor = code ? 'pointer' : '';
      }
    } else {
      canvas.style.cursor = pickAt(e, playTargets()) ? 'pointer' : '';
    }
  };
  const onLeave = () => {
    hovered = null;
    view.highlight(null, 'hover');
  };
  let down: { x: number; y: number } | null = null;
  const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: PointerEvent) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || !view.body) return;
    down = null;
    container.focus({ preventScroll: true });
    if (mode === 'edit') onEditClick(e);
    else onPlayClick(e);
  };

  function onEditClick(e: PointerEvent) {
    if (!slotMenu || !view.body) return;
    const hit = pickAt(e, [...view.body.pick.slots.keys()]);
    const code = hit ? view.body.pick.slots.get(hit) ?? null : null;
    if (!code) return slotMenu.close();
    view.highlight(code, 'select');
    slotMenu.open(code, view.slotScreenPos(code));
    void view.focusSlot(code).then(() => slotMenu.code === code && slotMenu.move(view.slotScreenPos(code)));
  }

  // play-mode picking is extended in the play UI layer
  let playTargets = (): THREE.Object3D[] => [];
  let onPlayClick = (_e: PointerEvent) => {};

  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  // ---------- keyboard (only while the container has focus) ----------
  const onKey = (e: KeyboardEvent) => {
    if (isField(e.target)) return;
    if (e.key === 'Tab' && editEnabled && ui.modeToggle !== false && !e.shiftKey) {
      e.preventDefault();
      vm.setMode(mode === 'edit' ? 'play' : 'edit');
      return;
    }
    if (mode === 'edit') {
      if (e.key === 'Escape') slotMenu?.close();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? vm.edit.redo() : vm.edit.undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); vm.edit.redo(); }
    } else {
      onPlayKey(e);
    }
  };
  let onPlayKey = (_e: KeyboardEvent) => {};
  container.addEventListener('keydown', onKey);

  const presenter: Presenter & { extendPlay: typeof extendPlay } = {
    render(model: MachineModel, m: Mode) {
      const modeChanged = m !== mode;
      mode = m;
      view.setModel(model);
      view.body?.led.set(lastLed);
      if (modeChanged) {
        view.highlight(null, 'hover');
        void view.overview();
      }
      syncUI();
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
      money?.update();
    },
    confirm(req: ConfirmRequest) {
      const message = req.kind === 'resize' ? t.confirmResize : req.kind === 'capacity' ? t.confirmCapacity : t.confirmRemoveType;
      return confirmDialog(container, { title: t.settings, message, list: req.codes, okText: t.ok, cancelText: t.cancel });
    },
    toast,
    dispose() {
      queue.cancelAll();
      camTween?.cancel();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      container.removeEventListener('keydown', onKey);
      cleanups.forEach((f) => f());
      container.querySelectorAll('.vm3d-panel,.vm3d-overlay,.vm3d-toast').forEach((el) => el.remove());
      container.classList.remove('vm3d-root');
      view.dispose();
      host.dispose();
    },
    extendPlay,
  };

  /** Hook used by the play UI layer (money panel, keypad, tray). */
  function extendPlay(x: { targets: () => THREE.Object3D[]; click: (e: PointerEvent, hit: THREE.Object3D | null) => void; key: (e: KeyboardEvent) => void }) {
    playTargets = x.targets;
    onPlayClick = (e) => x.click(e, pickAt(e, playTargets()));
    onPlayKey = x.key;
  }

  // ---------- play controls ----------
  const pressKeyVisual = (k: string) => {
    const key = view.body?.keyMeshes.get(k);
    if (!key) return;
    const z = key.userData.restZ as number;
    key.position.z = z - 0.007;
    host.requestRender();
    setTimeout(() => { key.position.z = z; host.requestRender(); }, 90);
  };
  const press = (k: string) => {
    pressKeyVisual(k);
    vm.press(k as never);
  };
  let ledTimer = 0;
  const revertLedSoon = () => {
    clearTimeout(ledTimer);
    ledTimer = window.setTimeout(() => { if (!vm.isDispensing && mode === 'play') presenter.led(vm.ledIdleText); }, 1500);
  };
  cleanups.push(vm.on('error', revertLedSoon), vm.on('balance', (v) => { if (v === 0 && !vm.isDispensing) revertLedSoon(); }), () => clearTimeout(ledTimer));

  extendPlay({
    targets: () => {
      const b = view.body;
      if (!b) return [];
      return [...b.pick.keys.keys(), b.pick.coinSlot, b.pick.refundBtn, b.pick.trayFlap, ...view.trayGroup.children];
    },
    click: (_e, hit) => {
      const b = view.body;
      if (!hit || !b) return;
      let o: THREE.Object3D | null = hit;
      while (o && o.parent !== view.trayGroup && o !== b.group) o = o.parent;
      if (o && o.parent === view.trayGroup) return void pickUp(host, o);
      const key = b.pick.keys.get(hit);
      if (key) return press(key);
      if (hit === b.pick.refundBtn) return void vm.refund();
      if (hit === b.pick.coinSlot) return void vm.insertMoney(vm.options.denominations[0]);
      if (hit === b.pick.trayFlap) {
        const last = view.trayGroup.children.at(-1);
        if (last) void pickUp(host, last);
      }
    },
    key: (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Enter') press('OK');
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key.toLowerCase() === 'c') press('C');
      else return;
      e.preventDefault();
    },
  });

  syncUI();
  return presenter;
}
