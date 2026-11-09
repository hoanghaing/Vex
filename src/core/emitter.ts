type Handler = (...args: any[]) => void;

export class Emitter<E extends { [K in keyof E]: Handler }> {
  private handlers = new Map<keyof E, Set<Handler>>();

  on<K extends keyof E>(event: K, fn: E[K]): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(fn);
    return () => this.off(event, fn);
  }

  off<K extends keyof E>(event: K, fn: E[K]): void {
    this.handlers.get(event)?.delete(fn);
  }

  emit<K extends keyof E>(event: K, ...args: Parameters<E[K]>): void {
    this.handlers.get(event)?.forEach((fn) => fn(...args));
  }

  clear(): void {
    this.handlers.clear();
  }
}
