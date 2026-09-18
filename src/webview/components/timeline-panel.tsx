import { useMemo } from 'preact/hooks';
import { collectEvents } from '../animation-events';
import type { AnimationEvent } from '../animation-events';

export const PLAYBACK_SPEEDS = [0.1, 0.25, 0.5, 1, 2, 5] as const;

const SCRUBBER_STEP_SECONDS = 0.001;
// The thumb is 12px wide and its centre only travels between 6px and
// `width - 6px`. Event markers have to use the same inset or they drift away
// from the playhead towards both ends of the track.
const THUMB_SIZE_PX = 12;

export const timelinePanelStyles = `
.timeline-container {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    user-select: none;
}
.timeline-button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius);
    color: var(--text-secondary);
    cursor: pointer;
}
.timeline-button:hover:not(:disabled) {
    background: var(--vscode-toolbar-hoverBackground, var(--hover-bg));
    color: var(--text-primary);
}
.timeline-button:disabled { opacity: 0.4; cursor: default; }
.timeline-button.is-play { color: var(--text-primary); }
.timeline-button.is-active { color: var(--accent); border-color: var(--accent); }
.timeline-time {
    flex-shrink: 0;
    min-width: 54px;
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
}
.timeline-time-current { text-align: right; color: var(--text-primary); }
.timeline-track { flex: 1; min-width: 0; padding-top: var(--sp-1); }
.timeline-range {
    -webkit-appearance: none;
    appearance: none;
    display: block;
    width: 100%;
    height: 4px;
    margin: 0;
    background: var(--input-bg);
    border: 1px solid var(--input-border-color);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
}
.timeline-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
}
/* Markers sit under the track rather than over it, so a click still lands on
   the slider and each tick keeps a hit area worth aiming at. */
.timeline-markers { position: relative; height: 9px; margin-top: 3px; }
.timeline-marker {
    position: absolute;
    top: 0;
    display: flex;
    justify-content: center;
    width: 11px;
    height: 100%;
    margin-left: -5.5px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
}
.timeline-marker-tick {
    width: 2px;
    height: 100%;
    border-radius: 1px;
    background: var(--event-marker);
}
.timeline-marker:hover .timeline-marker-tick { background: var(--text-primary); }
.timeline-speed {
    flex-shrink: 0;
    padding: 2px var(--sp-1);
    background: var(--vscode-dropdown-background, var(--input-bg));
    color: var(--vscode-dropdown-foreground, var(--input-fg));
    border: 1px solid var(--vscode-dropdown-border, var(--input-border-color));
    border-radius: var(--radius);
    font-family: inherit;
    font-size: 12px;
    outline: none;
    cursor: pointer;
}
.timeline-speed:hover { border-color: var(--accent); }
.timeline-empty {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
    font-size: 12px;
}`;

type EventMarker = {
  readonly time: number;
  readonly label: string;
};

// Events authored on the same frame would stack into one unreadable tick, so
// they share a marker and list their names in its tooltip.
function groupByTime(events: readonly AnimationEvent[]): readonly EventMarker[] {
  const names = new Map<number, string[]>();
  events.forEach((event) => {
    const existing = names.get(event.time);
    if (existing) existing.push(event.name);
    else names.set(event.time, [event.name]);
  });
  return [...names].map(([time, grouped]) => ({ time, label: `${grouped.join(', ')} @ ${time.toFixed(3)}s` }));
}

function markerOffset(ratio: number) {
  return `calc(${THUMB_SIZE_PX / 2}px + (100% - ${THUMB_SIZE_PX}px) * ${ratio})`;
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 2.5l9 5.5-9 5.5v-11z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4 3h3v10H4V3zm5 0h3v10H9V3z" />
    </svg>
  );
}

function StepBackIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M3 3h2v10H3V3zm11 0v10L6 8l8-5z" />
    </svg>
  );
}

function StepForwardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M11 3h2v10h-2V3zM2 3l8 5-8 5V3z" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8a5 5 0 0 1 5-5h5" />
      <path d="M11 1l2 2-2 2" />
      <path d="M13 8a5 5 0 0 1-5 5H3" />
      <path d="M5 11l-2 2 2 2" />
    </svg>
  );
}

export function TimelinePanel({
  animation,
  playing,
  loop,
  speed,
  onTogglePlay,
  onScrub,
  onStep,
  onLoop,
  onSpeed,
  scrubberRef,
  timeLabelRef,
}: {
  animation: SpineAnimation | null;
  playing: boolean;
  loop: boolean;
  speed: number;
  onTogglePlay: () => void;
  onScrub: (time: number) => void;
  onStep: (frames: number) => void;
  onLoop: (value: boolean) => void;
  onSpeed: (value: number) => void;
  // Both are written to by the render loop - see the ticker effect in app.tsx.
  scrubberRef: { current: HTMLInputElement | null };
  timeLabelRef: { current: HTMLSpanElement | null };
}) {
  const markers = useMemo(() => (animation ? groupByTime(collectEvents(animation)) : []), [animation]);

  const duration = animation?.duration ?? 0;
  const idle = duration <= 0;

  return (
    <div class="panel timeline-container" data-panel>
      <button
        type="button"
        class="timeline-button"
        title="Step back one frame (Left arrow)"
        aria-label="Step back one frame"
        disabled={idle}
        onClick={() => onStep(-1)}
      >
        <StepBackIcon />
      </button>
      {/* Pausing stops every track, so the transport stays live even when the
          selected track is empty - only the per-track controls go dim. */}
      <button
        type="button"
        class="timeline-button is-play"
        title={playing ? 'Pause (Space)' : 'Play (Space)'}
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={onTogglePlay}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        type="button"
        class="timeline-button"
        title="Step forward one frame (Right arrow)"
        aria-label="Step forward one frame"
        disabled={idle}
        onClick={() => onStep(1)}
      >
        <StepForwardIcon />
      </button>

      {idle ? (
        <span class="timeline-empty">No animation on this track.</span>
      ) : (
        <>
          <span class="timeline-time timeline-time-current" ref={timeLabelRef} />
          <div class="timeline-track">
            <input
              class="timeline-range"
              type="range"
              min="0"
              max={duration}
              step={SCRUBBER_STEP_SECONDS}
              ref={scrubberRef}
              aria-label="Animation time"
              onInput={(e) => onScrub(parseFloat((e.target as HTMLInputElement).value))}
            />
            <div class="timeline-markers">
              {markers.map((marker) => (
                <button
                  key={marker.time}
                  type="button"
                  class="timeline-marker"
                  style={{ left: markerOffset(marker.time / duration) }}
                  title={marker.label}
                  aria-label={`Jump to event ${marker.label}`}
                  onClick={() => onScrub(marker.time)}
                >
                  <span class="timeline-marker-tick" />
                </button>
              ))}
            </div>
          </div>
          <span class="timeline-time">{duration.toFixed(3)}s</span>
        </>
      )}

      <select
        class="timeline-speed"
        title="Playback speed"
        aria-label="Playback speed"
        value={String(speed)}
        onChange={(e) => onSpeed(parseFloat((e.target as HTMLSelectElement).value))}
      >
        {PLAYBACK_SPEEDS.map((value) => (
          <option key={value} value={String(value)}>
            {value}x
          </option>
        ))}
      </select>
      <button
        type="button"
        class={`timeline-button${loop ? ' is-active' : ''}`}
        title="Loop the animation"
        aria-label="Loop the animation"
        aria-pressed={loop}
        onClick={() => onLoop(!loop)}
      >
        <LoopIcon />
      </button>
    </div>
  );
}
