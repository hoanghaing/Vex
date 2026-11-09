import { VendingMachine, type VendingOptions } from './VendingMachine';
import { createPresenter } from './presenter';

export function createVendingMachine(container: HTMLElement, opts: VendingOptions = {}): VendingMachine {
  const vm = new VendingMachine(container, opts);
  if (!opts.headless) vm.attach(createPresenter(vm, container));
  return vm;
}

export { VendingMachine, DEFAULT_DENOMINATIONS } from './VendingMachine';
export type { VendingOptions, VendingEvents, Mode, UIOptions, PurchaseEvent, ConfirmRequest } from './VendingMachine';
export { VendingXMLError, parseXML, serializeXML } from './model/xml';
export { DEFAULT_MODEL, SHAPE_DEFAULTS, LIMITS } from './model/defaults';
export { slotCode, parseCode, allCodes } from './model/grid';
export { DEFAULT_MESSAGES } from './core/messages';
export type { Messages } from './core/messages';
export type { MachineModel, ItemType, Slot, Theme, Shape } from './model/types';
export type { VendError, VendKey } from './vend/machine';
