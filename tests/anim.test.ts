import { easing, tween, AnimationQueue, type FrameHost } from '../src/three/anim';

function fakeHost() {
  const cbs = new Set<(dt: number) => boolean>();
  const host: FrameHost = { onFrame(cb) { cbs.add(cb); return () => cbs.delete(cb); }, requestRender() {} };
  const step = (dt: number, n = 1) => { for (let i = 0; i < n; i++) for (const cb of [...cbs]) if (!cb(dt)) cbs.delete(cb); };
  return { host, step, size: () => cbs.size };
}

describe('easing', () => {
  it('maps 0→0 and 1→1', () => {
    for (const [name, f] of Object.entries(easing)) {
      expect(f(0), name).toBeCloseTo(0, 6);
      expect(f(1), name).toBeCloseTo(1, 6);
    }
  });
});

describe('tween', () => {
  it('calls fn with 1 at the end and resolves', async () => {
    const { host, step, size } = fakeHost();
    const seen: number[] = [];
    const t = tween(host, 0.5, (v) => seen.push(v));
    step(0.1, 10);
    await t.promise;
    expect(seen.at(-1)).toBe(1);
    expect(size()).toBe(0);
  });

  it('cancel resolves and stops calling fn', async () => {
    const { host, step } = fakeHost();
    const seen: number[] = [];
    const t = tween(host, 1, (v) => seen.push(v));
    step(0.1, 2);
    t.cancel();
    const n = seen.length;
    step(0.1, 5);
    await t.promise;
    expect(seen.length).toBe(n);
    expect(seen.at(-1)).toBeLessThan(1);
  });
});

describe('AnimationQueue', () => {
  it('cancelAll flags running tasks as cancelled', async () => {
    const q = new AnimationQueue();
    let flag: { cancelled: boolean } | null = null;
    let release!: () => void;
    const p = q.run((signal) => { flag = signal; return new Promise<void>((r) => (release = r)); });
    q.cancelAll();
    expect(flag!.cancelled).toBe(true);
    release();
    await p;
  });

  it('runs tasks independently', async () => {
    const q = new AnimationQueue();
    const out: number[] = [];
    await Promise.all([q.run(async () => { out.push(1); }), q.run(async () => { out.push(2); })]);
    expect(out.sort()).toEqual([1, 2]);
  });
});
