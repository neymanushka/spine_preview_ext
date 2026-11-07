import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { PerformanceProfiler, PerformanceStats } from '../performance-stats';
import { MetricRow } from './metric-row';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { collectBlendModes } from '../blend-mode-stats';
import { Tooltip } from './tooltip';

// Refresh four times per second to keep metrics readable without rendering UI every frame.
const PERFORMANCE_REFRESH_INTERVAL_MS = 250;

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
.blend-mode-row { flex-wrap: wrap; }
.blend-mode-row dd { min-width: 0; white-space: normal; }
.blend-mode-summary { padding: 0; border: none; background: none; color: inherit; font: inherit; text-align: left; cursor: help; }
.blend-mode-tooltip { white-space: normal; overflow-wrap: anywhere; }
`;

export function PerformancePanel({
  profiler,
  skeleton,
  overlaysVisible,
  onHideOverlays,
}: {
  profiler: PerformanceProfiler;
  skeleton: Spine | undefined;
  overlaysVisible: boolean;
  onHideOverlays: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<PerformanceStats & { blendModes: ReturnType<typeof collectBlendModes> | null }>({
    drawCalls: null,
    peak: null,
    cpuUpdateMs: null,
    cpuUpdatePeakMs: null,
    blendModes: null,
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
    setStats({ ...profiler.stats, blendModes: null });
    const timer = window.setInterval(
      () => setStats({ ...profiler.stats, blendModes: collectBlendModes(skeleton) }),
      PERFORMANCE_REFRESH_INTERVAL_MS,
    );
    return () => {
      window.clearInterval(timer);
      profiler.stop();
    };
  }, [open, profiler, skeleton]);

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
              <div class="metric-row blend-mode-row">
                <dt>Blend modes</dt>
                <dd>
                  <Tooltip
                    content={
                      <div class="blend-mode-tooltip">
                        <div>Rendered slots in the current pose, grouped by blend mode.</div>
                        {stats.blendModes
                          ?.filter(({ label }) => label !== 'Normal')
                          .map(({ label, slots }) => (
                            <div key={label}>
                              {label}: {slots.join(', ')}
                            </div>
                          ))}
                      </div>
                    }
                  >
                    {(tooltipId) => (
                      <button type="button" class="blend-mode-summary" aria-describedby={tooltipId}>
                        {stats.blendModes === null
                          ? '—'
                          : stats.blendModes.map(({ label, slots }) => `${label} ${slots.length}`).join(' · ') ||
                            'None'}
                      </button>
                    )}
                  </Tooltip>
                </dd>
              </div>
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
