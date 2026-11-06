import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { PerformanceProfiler, PerformanceStats } from '../performance-stats';
import { MetricRow } from './metric-row';

export const performancePanelStyles = `
.performance-button { white-space: nowrap; flex-shrink: 0; }
.performance-button[aria-expanded="true"] { border-color: var(--accent); }
.performance-panel {
    position: fixed;
    top: 58px;
    right: var(--sp-2);
    bottom: 100px;
    width: 300px;
    max-width: calc(100vw - 16px);
    overflow-y: auto;
    z-index: 2;
    user-select: text;
}
.performance-heading { display: flex; align-items: center; justify-content: space-between; }
.performance-content { padding: var(--sp-3); }
.performance-section { margin: 0 0 var(--sp-3); font-size: 13px; }
`;

export function PerformancePanel({
  profiler,
  overlaysVisible,
  onHideOverlays,
}: {
  profiler: PerformanceProfiler;
  overlaysVisible: boolean;
  onHideOverlays: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<PerformanceStats>({
    drawCalls: null,
    peak: null,
    cpuUpdateMs: null,
    cpuUpdatePeakMs: null,
  });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    profiler.start();
    setStats({ ...profiler.stats });
    const timer = window.setInterval(() => setStats({ ...profiler.stats }), 250);
    return () => {
      window.clearInterval(timer);
      profiler.stop();
    };
  }, [open, profiler]);

  useLayoutEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        class="ui-button performance-button"
        aria-expanded={open}
        aria-controls="performance-panel"
        onClick={() => setOpen(!open)}
      >
        Performance
      </button>
      {open && (
        <section
          ref={panel}
          id="performance-panel"
          class="panel performance-panel"
          data-panel
          tabIndex={-1}
          aria-label="Performance"
        >
          <div class="panel-header performance-heading">
            Performance
            <button type="button" class="ui-button performance-action" aria-label="Close Performance" onClick={close}>
              ×
            </button>
          </div>
          <div class="performance-content">
            <h3 class="performance-section">Rendering</h3>
            <dl class="metric-list">
              <MetricRow
                label="Draw calls / frame"
                current={stats.drawCalls}
                maximum={stats.peak}
                maximumHint="Peak since opening this panel or switching skeletons"
              />
            </dl>
            <h3 class="performance-section">Animation</h3>
            <dl class="metric-list">
              <MetricRow
                label="CPU update / frame"
                hint="Smoothed CPU time for the per-frame animation and skeleton pose update, including while paused. Excludes overlays and rendering."
                current={stats.cpuUpdateMs}
                maximum={stats.cpuUpdatePeakMs}
                maximumHint="Highest single update time since opening this panel or switching skeletons"
                digits={2}
                unit="ms"
              />
            </dl>
            {overlaysVisible && (
              <button type="button" class="ui-button performance-action" onClick={onHideOverlays}>
                Hide overlays
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
