import { Emitter } from '../core/emitter';
import { type Messages, type MoneyFormat, defaultFormat, fill } from '../core/messages';
import type { Slot } from '../model/types';

export type VendError = 'MA_SAI' | 'HET_HANG' | 'THIEU_TIEN';
export type VendKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'C' | 'OK';

export interface VendEvents {
  display: (text: string) => void;
  balance: (v: number) => void;
  error: (e: { code: string; reason: VendError; missing?: number }) => void;
  dispense: (e: { code: string; itemType: string; price: number; change: number }) => void;
  refund: (v: number) => void;
}

export class VendState extends Emitter<VendEvents> {
  balance = 0;
  input = '';
  locked = false;

  constructor(
    private getSlot: (code: string) => Slot | undefined,
    private isValidCode: (code: string) => boolean,
    private msgs: Messages,
    private format: MoneyFormat = defaultFormat,
  ) {
    super();
  }

  /** Text the LED should show when idle. */
  idleText(): string {
    return this.balance > 0 ? fill(this.msgs.led.balance, this.format(this.balance)) : this.msgs.led.welcome;
  }

  insertMoney(v: number): boolean {
    if (this.locked || !(v > 0) || !Number.isFinite(v)) return false;
    this.balance += v;
    this.emit('balance', this.balance);
    this.emit('display', this.idleText());
    return true;
  }

  press(key: VendKey): void {
    if (this.locked) return;
    if (key === 'C') {
      this.input = '';
      this.emit('display', this.idleText());
    } else if (key === 'OK') {
      this.commit();
    } else if (/^\d$/.test(key) && this.input.length < 3) {
      this.input += key;
      this.emit('display', this.input);
    }
  }

  select(code: string): void {
    if (this.locked) return;
    this.input = String(code).slice(0, 3);
    this.commit();
  }

  refund(): number {
    if (this.locked) return 0;
    const v = this.balance;
    this.balance = 0;
    this.input = '';
    if (v > 0) {
      this.emit('refund', v);
      this.emit('balance', 0);
      this.emit('display', fill(this.msgs.led.refund, this.format(v)));
    }
    return v;
  }

  unlock(): void {
    this.locked = false;
  }

  reset(): void {
    this.balance = 0;
    this.input = '';
    this.locked = false;
    this.emit('balance', 0);
    this.emit('display', this.msgs.led.welcome);
  }

  private commit(): void {
    const code = this.input;
    this.input = '';
    if (!this.isValidCode(code)) return this.fail(code, 'MA_SAI', this.msgs.led.invalid);
    const slot = this.getSlot(code);
    if (!slot || slot.stock <= 0) return this.fail(code, 'HET_HANG', this.msgs.led.soldOut);
    if (this.balance < slot.price) {
      const missing = slot.price - this.balance;
      return this.fail(code, 'THIEU_TIEN', fill(this.msgs.led.missing, this.format(missing)), missing);
    }
    const change = this.balance - slot.price;
    this.balance = 0;
    this.locked = true;
    this.emit('balance', 0);
    this.emit('display', fill(this.msgs.led.change, this.format(change)));
    this.emit('dispense', { code, itemType: slot.itemType, price: slot.price, change });
  }

  private fail(code: string, reason: VendError, text: string, missing?: number): void {
    this.emit('error', missing === undefined ? { code, reason } : { code, reason, missing });
    this.emit('display', text);
  }
}
