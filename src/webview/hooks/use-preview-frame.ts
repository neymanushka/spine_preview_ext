import { useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import type { Ticker } from 'pixi.js';
import { DebugOverlays } from '../debug-overlays';
import type { OverlayOptions } from '../debug-overlays';
import type { PerformanceProfiler } from '../performance-stats';

// The stats readout is written straight into the DOM every few frames instead
// of living in state: at 60 fps a state update would re-render the whole tree,
// animation list included, and the meter would become the thing it measures.
// The playhead is written the same way, for the same reason.
const STATS_SMOOTHING = 0.1;
const STATS_FLUSH_INTERVAL_MS = 250;

export function usePreviewFrame({
  selectedFile,
  spineInstances,
  currentAnimRef,
  ticker,
  profiler,
  speedRef,
  overlays,
  overlaysHidden,
  syncTimelineDom,
}: {
  selectedFile: string;
  spineInstances: Record<string, Spine>;
  currentAnimRef: RefObject<Spine | null>;
  ticker: Ticker;
  profiler: PerformanceProfiler;
  speedRef: { current: number };
  overlays: OverlayOptions;
  overlaysHidden: boolean;
  syncTimelineDom: () => void;
}) {
  const debugRef = useRef<DebugOverlays | null>(null);
  const overlaysRef = useRef(overlays);
  const overlaysHiddenRef = useRef(overlaysHidden);

  const statsRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    overlaysRef.current = overlays;
    overlaysHiddenRef.current = overlaysHidden;
  }, [overlays, overlaysHidden]);

  useEffect(() => {
    const anim = spineInstances[selectedFile];
    if (!anim) return;
    const debug = new DebugOverlays(anim);
    debugRef.current = debug;
    return () => {
      debugRef.current = null;
      debug.destroy();
    };
  }, [selectedFile, spineInstances]);

  useEffect(() => {
    let smoothedUpdateMs = 0;
    let smoothedFps = 0;
    let lastFlush = 0;

    const tick = () => {
      const anim = currentAnimRef.current;
      if (!anim) return;
      const startedAt = performance.now();
      // Each entry owns its pause through timeScale. Keep updating while any
      // track plays; a zero delta still reapplies scrubs/skins when all pause.
      const anyPlaying = anim.state.tracks.some((entry) => entry && entry.timeScale !== 0);
      const delta = anyPlaying ? (ticker.deltaMS / 1000) * speedRef.current : 0;
      profiler.update(() => anim.update(delta));
      debugRef.current?.render(overlaysRef.current, overlaysHiddenRef.current);
      const elapsed = performance.now() - startedAt;
      syncTimelineDom();
      const fps = ticker.deltaMS > 0 ? 1000 / ticker.deltaMS : 0;
      smoothedUpdateMs += (elapsed - smoothedUpdateMs) * STATS_SMOOTHING;
      smoothedFps += (fps - smoothedFps) * STATS_SMOOTHING;
      if (startedAt - lastFlush < STATS_FLUSH_INTERVAL_MS) return;
      lastFlush = startedAt;
      if (statsRef.current) {
        statsRef.current.textContent = `${smoothedUpdateMs.toFixed(2)} ms | ${Math.round(smoothedFps)} fps`;
      }
    };

    ticker.add(tick);
    return () => ticker.remove(tick);
  }, [ticker, syncTimelineDom, profiler, currentAnimRef, speedRef]);

  return statsRef;
}
