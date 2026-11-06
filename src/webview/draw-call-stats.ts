import type { WebGLRenderer } from 'pixi.js';

export type DrawCallStats = { drawCalls: number | null; peak: number | null };
export type DrawCallProfiler = ReturnType<typeof createDrawCallStats>;

type DrawCallFn = 'drawArrays' | 'drawElements' | 'drawArraysInstanced' | 'drawElementsInstanced';

export function createDrawCallStats(renderer: WebGLRenderer) {
  const stats: DrawCallStats = { drawCalls: null, peak: null };
  let active = false;
  let count = 0;
  let restore: (() => void)[] = [];

  const detach = () => {
    for (const undo of restore) undo();
    restore = [];
  };
  const attach = () => {
    detach();
    const gl = renderer.gl;
    const hook = <K extends DrawCallFn>(key: K) => {
      const original = gl[key];
      if (typeof original === 'function') {
        const wrapped = function (this: typeof gl, ...args: Parameters<typeof original>) {
          count += 1;
          return Reflect.apply(original, this, args);
        } as typeof original;
        gl[key] = wrapped;
        restore.push(() => {
          if (gl[key] === wrapped) gl[key] = original;
        });
      }
    };
    hook('drawArrays');
    hook('drawElements');
    hook('drawArraysInstanced');
    hook('drawElementsInstanced');
  };
  const lifecycle = {
    contextChange: attach,
    destroy: () => stop(),
  };
  const reset = () => {
    stats.drawCalls = null;
    stats.peak = null;
  };
  const stop = () => {
    if (!active) return;
    active = false;
    detach();
    renderer.runners.contextChange.remove(lifecycle);
    renderer.runners.destroy.remove(lifecycle);
    reset();
  };

  return {
    stats,
    reset,
    start() {
      if (active) return;
      reset();
      attach();
      renderer.runners.contextChange.add(lifecycle);
      renderer.runners.destroy.add(lifecycle);
      active = true;
    },
    stop,
    render(draw: () => void) {
      if (!active) {
        draw();
        return;
      }
      count = 0;
      stats.drawCalls = null;
      draw();
      stats.drawCalls = count;
      stats.peak = Math.max(stats.peak ?? 0, count);
    },
  };
}
