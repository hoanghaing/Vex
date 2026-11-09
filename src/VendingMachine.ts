import { Emitter } from './core/emitter';
import { type Messages, type MoneyFormat, defaultFormat, mergeMessages } from './core/messages';
import { DEFAULT_MODEL } from './model/defaults';
import * as ops from './model/edit';
import { clampGrid, parseCode } from './model/grid';
import { History } from './model/history';
import type { ItemType, MachineModel, Slot, Theme } from './model/types';
import { parseXML, serializeXML } from './model/xml';
import { type VendError, type VendKey, VendState } from './vend/machine';

export type Mode = 'edit' | 'play';

export interface UIOptions {
  toolbar?: boolean;
  itemTypePanel?: boolean;
  settingsPanel?: boolean;
  moneyPanel?: boolean;
  modeToggle?: boolean;
}

export interface VendingOptions {
  xml?: string;
  mode?: Mode;
  allowEdit?: boolean;
  /** Defaults to `!allowEdit`. */
  persistSales?: boolean;
  denominations?: number[];
  currency?: { code: string; format: MoneyFormat };
  ui?: UIOptions;
  messages?: { led?: Partial<Messages['led']>; ui?: Record<string, string> };
  /** Internal/testing: no WebGL scene, no DOM UI. */
  headless?: boolean;
}

export interface ConfirmRequest {
  kind: 'resize' | 'capacity' | 'removeItemType';
  codes: string[];
}

export interface PurchaseEvent { code: string; itemType: string; price: number; change: number }

export interface VendingEvents {
  change: (e: { xml: string }) => void;
  purchase: (e: PurchaseEvent) => void;
  error: (e: { code: string; reason: VendError; missing?: number }) => void;
  warning: (msg: string) => void;
  modechange: (m: Mode) => void;
  balance: (v: number) => void;
}

interface InternalOptions {
  _confirm?: (req: ConfirmRequest) => Promise<boolean>;
  _holdDispense?: boolean;
}

/** Extension points used by the 3D/UI layers (attached when not headless). */
export interface Presenter {
  render(model: MachineModel, mode: Mode): void;
  /** Animate a dispense; resolves when finished or cancelled. Called before stock is decremented in the view. */
  dispense(code: string): Promise<void>;
  cancelAnimations(): void;
  led(text: string): void;
  confirm(req: ConfirmRequest): Promise<boolean>;
  toast(msg: string): void;
  dispose(): void;
}

export const DEFAULT_DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000];

export class VendingMachine {
  readonly options: Required<Pick<VendingOptions, 'allowEdit' | 'persistSales' | 'denominations'>> & VendingOptions & InternalOptions;
  readonly messages: Messages;
  readonly format: MoneyFormat;
  private emitter = new Emitter<VendingEvents>();
  private history: History<MachineModel>;
  private _model: MachineModel;
  private playModel: MachineModel | null = null;
  private _mode: Mode;
  private vend: VendState;
  private presenter: Presenter | null = null;
  private disposed = false;
  private dispensing = 0;

  constructor(readonly container: HTMLElement, opts: VendingOptions & InternalOptions = {}) {
    const allowEdit = opts.allowEdit ?? true;
    this.options = {
      ...opts,
      allowEdit,
      persistSales: opts.persistSales ?? !allowEdit,
      denominations: opts.denominations?.length ? opts.denominations : DEFAULT_DENOMINATIONS,
    };
    this.messages = mergeMessages(opts.messages);
    this.format = opts.currency?.format ?? defaultFormat;

    let model = DEFAULT_MODEL();
    const warnings: string[] = [];
    if (opts.xml) {
      const r = parseXML(opts.xml);
      model = r.model;
      warnings.push(...r.warnings);
    }
    this._model = model;
    this.history = new History(model);
    this._mode = allowEdit ? opts.mode ?? 'edit' : 'play';
    if (this._mode === 'play' && !this.options.persistSales) this.playModel = structuredClone(model);

    this.vend = new VendState(
      (code) => this.activeModel.slots[code],
      (code) => !!parseCode(code, this.activeModel.rows, this.activeModel.cols),
      this.messages,
      this.format,
    );
    this.vend.on('display', (t) => this.presenter?.led(t));
    this.vend.on('balance', (v) => this.emitter.emit('balance', v));
    this.vend.on('error', (e) => this.emitter.emit('error', e));
    this.vend.on('dispense', (e) => this.onDispense(e));

    // Warnings are emitted async so listeners attached right after construction receive them.
    if (warnings.length) queueMicrotask(() => warnings.forEach((w) => this.emitter.emit('warning', w)));
  }

  /** Attach the 3D/UI presenter (done by createVendingMachine when not headless). */
  attach(p: Presenter): void {
    this.presenter = p;
    this.refresh();
    p.led(this.vend.idleText());
  }

  // ---------- state ----------
  /** Editor model (treat as read-only). */
  get model(): MachineModel { return this._model; }
  /** Model currently displayed (play copy in sandbox mode). */
  get activeModel(): MachineModel { return this.playModel ?? this._model; }
  get mode(): Mode { return this._mode; }
  get balance(): number { return this.vend.balance; }
  get isDispensing(): boolean { return this.vend.locked; }
  /** Text the LED shows when idle (welcome or balance). */
  get ledIdleText(): string { return this.vend.idleText(); }
  get canUndo(): boolean { return this.history.canUndo; }
  get canRedo(): boolean { return this.history.canRedo; }

  // ---------- events ----------
  on<K extends keyof VendingEvents>(e: K, fn: VendingEvents[K]): () => void { return this.emitter.on(e, fn); }
  off<K extends keyof VendingEvents>(e: K, fn: VendingEvents[K]): void { this.emitter.off(e, fn); }

  // ---------- IO ----------
  load(xml: string): void {
    if (this.disposed) return;
    const { model, warnings } = parseXML(xml); // throws VendingXMLError, state untouched
    this.stopDispense();
    this._model = model;
    this.history.reset(model);
    this.playModel = this._mode === 'play' && !this.options.persistSales ? structuredClone(model) : null;
    this.vend.reset();
    this.refresh();
    warnings.forEach((w) => this.emitter.emit('warning', w));
  }

  toXML(): string {
    return serializeXML(this._model);
  }

  download(filename = 'machine.xml'): void {
    if (this.disposed) return;
    const blob = new Blob([this.toXML()], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  setMode(m: Mode): void {
    if (this.disposed || m === this._mode) return;
    if (m === 'edit' && !this.options.allowEdit) {
      this.emitter.emit('warning', 'Edit mode is disabled (allowEdit: false)');
      return;
    }
    this.stopDispense();
    this.playModel = m === 'play' && !this.options.persistSales ? structuredClone(this._model) : null;
    this._mode = m;
    this.vend.reset();
    this.refresh();
    this.emitter.emit('modechange', m);
  }

  // ---------- play ----------
  insertMoney(v: number): boolean {
    if (this.disposed || this._mode !== 'play') return false;
    return this.vend.insertMoney(v);
  }

  press(key: VendKey): void {
    if (this.disposed || this._mode !== 'play') return;
    this.vend.press(key);
  }

  select(code: string): void {
    if (this.disposed || this._mode !== 'play') return;
    this.vend.select(code);
  }

  refund(): number {
    if (this.disposed || this._mode !== 'play') return 0;
    return this.vend.refund();
  }

  private onDispense(e: PurchaseEvent): void {
    const run = ++this.dispensing;
    const anim = this.presenter && !this.options._holdDispense ? this.presenter.dispense(e.code) : null;
    this.decrementStock(e.code);
    this.emitter.emit('purchase', e);
    if (this.options._holdDispense) return;
    if (!anim) {
      this.vend.unlock();
      return;
    }
    void anim.finally(() => {
      if (run !== this.dispensing || this.disposed) return;
      this.vend.unlock();
      this.presenter?.led(this.vend.idleText());
    });
  }

  private decrementStock(code: string): void {
    const target = this.activeModel;
    const slot = target.slots[code];
    if (!slot) return;
    if (this.playModel) {
      slot.stock = Math.max(0, slot.stock - 1);
    } else {
      this.commit(ops.setSlot(this._model, code, { stock: slot.stock - 1 }), false);
    }
  }

  private stopDispense(): void {
    this.dispensing++;
    this.presenter?.cancelAnimations();
    this.vend.unlock();
  }

  // ---------- edit ----------
  readonly edit = {
    setSlot: (code: string, patch: Partial<Omit<Slot, 'code'>>) => this.apply(ops.setSlot(this._model, code, patch)),
    clearSlot: (code: string) => this.apply(ops.clearSlot(this._model, code)),
    upsertItemType: (t: ItemType) => this.apply(ops.upsertItemType(this._model, t)),
    setMeta: (patch: Partial<{ name: string; theme: Partial<Theme> }>) => this.apply(ops.setMeta(this._model, patch)),
    removeItemType: async (id: string): Promise<boolean> => {
      const codes = ops.slotsUsing(this._model, id);
      if (codes.length && !(await this.confirm({ kind: 'removeItemType', codes }))) return false;
      this.apply(ops.removeItemType(this._model, id).model);
      return true;
    },
    resizeGrid: async (rows: number, cols: number): Promise<boolean> => {
      const codes = ops.previewResize(this._model, rows, cols);
      if (codes.length && !(await this.confirm({ kind: 'resize', codes }))) return false;
      const r = ops.resizeGrid(this._model, rows, cols);
      r.warnings.forEach((w) => this.emitter.emit('warning', w));
      if (r.model.rows !== this._model.rows || r.model.cols !== this._model.cols) this.apply(r.model);
      return true;
    },
    setCapacity: async (cap: number): Promise<boolean> => {
      const codes = ops.previewCapacity(this._model, cap);
      if (codes.length && !(await this.confirm({ kind: 'capacity', codes }))) return false;
      this.apply(ops.setCapacity(this._model, cap).model);
      return true;
    },
    newMachine: (rows = 6, cols = 10) => {
      const g = clampGrid(rows, cols);
      g.warnings.forEach((w) => this.emitter.emit('warning', w));
      const m = DEFAULT_MODEL();
      m.rows = g.rows;
      m.cols = g.cols;
      m.itemTypes = structuredClone(this._model.itemTypes);
      this.apply(m);
    },
    undo: () => {
      const m = this.history.undo();
      if (m) this.setModelInternal(m);
    },
    redo: () => {
      const m = this.history.redo();
      if (m) this.setModelInternal(m);
    },
  };

  private apply(next: MachineModel): void {
    if (this.disposed) return;
    this.commit(next, true);
  }

  private commit(next: MachineModel, render: boolean): void {
    this._model = next;
    this.history.push(next);
    if (render) this.refresh();
    this.emitter.emit('change', { xml: this.toXML() });
  }

  private setModelInternal(m: MachineModel): void {
    if (this.disposed) return;
    this._model = m;
    this.refresh();
    this.emitter.emit('change', { xml: this.toXML() });
  }

  private confirm(req: ConfirmRequest): Promise<boolean> {
    const c = (this.options as InternalOptions)._confirm;
    if (c) return c(req);
    return this.presenter ? this.presenter.confirm(req) : Promise.resolve(true);
  }

  /** Re-render the presenter with the active model. */
  refresh(): void {
    this.presenter?.render(this.activeModel, this._mode);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.dispensing++;
    this.presenter?.dispose();
    this.presenter = null;
    this.vend.clear();
    this.emitter.clear();
  }

  get isDisposed(): boolean { return this.disposed; }
}
