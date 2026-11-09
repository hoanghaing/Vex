export class History<T> {
  private stack: T[];
  private index = 0;

  constructor(initial: T, private limit = 50) {
    this.stack = [structuredClone(initial)];
  }

  get current(): T { return structuredClone(this.stack[this.index]); }
  get canUndo(): boolean { return this.index > 0; }
  get canRedo(): boolean { return this.index < this.stack.length - 1; }

  push(state: T): void {
    this.stack.length = this.index + 1;
    this.stack.push(structuredClone(state));
    while (this.stack.length > this.limit) this.stack.shift();
    this.index = this.stack.length - 1;
  }

  undo(): T | null {
    if (!this.canUndo) return null;
    this.index--;
    return this.current;
  }

  redo(): T | null {
    if (!this.canRedo) return null;
    this.index++;
    return this.current;
  }

  /** Apply a change to every stored state (e.g. a sale that must survive undo/redo). */
  mapAll(fn: (state: T) => T): void {
    this.stack = this.stack.map((s) => fn(structuredClone(s)));
  }

  reset(state: T): void {
    this.stack = [structuredClone(state)];
    this.index = 0;
  }
}
