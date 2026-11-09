export type Ease = (t: number) => number;

export const easing = {
  linear: (t: number) => t,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInQuad: (t: number) => t * t,
  easeOutBounce: (t: number) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
} satisfies Record<string, Ease>;

/** Minimal host interface (SceneHost satisfies it). */
export interface FrameHost {
  onFrame(cb: (dt: number) => boolean): () => void;
  requestRender(): void;
}

export interface Tween { promise: Promise<void>; cancel(): void }

export function tween(host: FrameHost, duration: number, fn: (t: number) => void, ease: Ease = easing.easeInOutCubic): Tween {
  let elapsed = 0;
  let done = false;
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  const finish = () => {
    if (done) return;
    done = true;
    off();
    resolve();
  };
  const off = host.onFrame((dt) => {
    if (done) return false;
    elapsed += dt;
    const t = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
    fn(t >= 1 ? 1 : ease(t));
    if (t >= 1) {
      finish();
      return false;
    }
    return true;
  });
  return { promise, cancel: finish };
}

export interface AnimSignal {
  cancelled: boolean;
  /** Register a tween so cancelAll() stops it. */
  track(t: Tween): Tween;
}

export class AnimationQueue {
  private active = new Set<AnimSignal & { tweens: Set<Tween> }>();

  run(task: (signal: AnimSignal) => Promise<void>): Promise<void> {
    const tweens = new Set<Tween>();
    const signal = {
      cancelled: false,
      tweens,
      track: (t: Tween) => {
        tweens.add(t);
        void t.promise.then(() => tweens.delete(t));
        if (signal.cancelled) t.cancel();
        return t;
      },
    };
    this.active.add(signal);
    return task(signal).finally(() => this.active.delete(signal));
  }

  cancelAll(): void {
    for (const s of this.active) {
      s.cancelled = true;
      s.tweens.forEach((t) => t.cancel());
    }
  }
}

export const wait = (host: FrameHost, seconds: number, signal?: AnimSignal) => {
  const t = tween(host, seconds, () => {}, easing.linear);
  return (signal ? signal.track(t) : t).promise;
};
