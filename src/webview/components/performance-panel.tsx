import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { DrawCallProfiler, DrawCallStats } from '../draw-call-stats';

export const performancePanelStyles = `
.performance-button, .performance-action {
    font: inherit;
    color: var(--text-primary);
    background: var(--input-bg);
    border: 1px solid var(--input-border-color);
    border-radius: var(--radius);
    padding: var(--sp-1) var(--sp-2);
    cursor: pointer;
}
.performance-button { white-space: nowrap; flex-shrink: 0; }
.performance-button[aria-expanded="true"] { border-color: var(--accent); }
.performance-button:hover, .performance-action:hover { background: var(--hover-bg); }
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
.performance-values { margin: 0; font-variant-numeric: tabular-nums; }
.performance-values > div { display: flex; justify-content: space-between; gap: var(--sp-3); margin: var(--sp-2) 0; }
.performance-values dd { margin: 0; font-weight: 600; white-space: nowrap; }
.performance-peak { color: var(--text-secondary); font-weight: 400; }
`;

export function PerformancePanel({
  profiler,
  overlaysVisible,
  onHideOverlays,
}: {
  profiler: DrawCallProfiler;
  overlaysVisible: boolean;
  onHideOverlays: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<DrawCallStats>({ drawCalls: null, peak: null });
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
        class="performance-button"
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
            <button type="button" class="performance-action" aria-label="Close Performance" onClick={close}>
              ×
            </button>
          </div>
          <div class="performance-content">
            <h3 class="performance-section">Rendering</h3>
            <dl class="performance-values">
              <div>
                <dt>Draw calls / frame</dt>
                <dd>
                  {stats.drawCalls ?? '—'}
                  <span class="performance-peak" title="Peak since opening this panel or switching skeletons">
                    {' '}
                    · peak {stats.peak ?? '—'}
                  </span>
                </dd>
              </div>
            </dl>
            {overlaysVisible && (
              <button type="button" class="performance-action" onClick={onHideOverlays}>
                Hide overlays
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
