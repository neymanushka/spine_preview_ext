import type { Animation } from '@esotericsoftware/spine-pixi-v8';
import { Tooltip } from './tooltip';
import { collectEvents } from '../animation-events';
import { describeAnimation, describeConflict, drivenPhysics, trackConflicts } from '../animation-info';
import type { PhysicsConstraintData, TrackConflict } from '../animation-info';

export const animationListStyles = `
.list-container {
    user-select: none;
    overflow-y: auto;
    padding: var(--sp-1);
    min-width: 220px;
}
.list-item {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    color: var(--text-primary);
    border-radius: var(--radius);
    padding: 2px var(--sp-1);
    cursor: pointer;
    transition: background-color 0.15s;
}
.list-item:hover { background-color: var(--hover-bg); }
.list-item:active { background-color: var(--active-bg); color: var(--active-fg); }
.list-item-copy {
    display: flex;
    flex-shrink: 0;
    padding: var(--sp-1);
    background: none;
    border: none;
    border-radius: var(--radius);
    color: var(--text-secondary);
    cursor: pointer;
    opacity: 0;
}
.list-item:hover .list-item-copy { opacity: 1; }
.list-item-copy:focus-visible { opacity: 1; }
.list-item-copy:hover { background: var(--vscode-toolbar-hoverBackground, var(--hover-bg)); color: var(--text-primary); }
.list-item-name {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
    padding: 2px 0;
}
/* overflow: hidden drops the flex minimum to zero, so without a floor the
   badges after it could squeeze the name out entirely. */
.list-item-label { min-width: 4em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list-item-duration {
    flex-shrink: 0;
    color: var(--text-secondary);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
}
.list-item-conflict {
    flex-shrink: 0;
    align-self: center;
    padding: 0 3px;
    border: 1px solid currentColor;
    border-radius: var(--radius);
    font-size: 10px;
    line-height: 14px;
    color: var(--warning-fg);
}
.list-item-conflict.hidden { color: var(--error-fg); }
/* The tooltip lines take their badge's colour so the two read as one signal. */
.list-tooltip-conflict { color: var(--warning-fg); }
.list-tooltip-conflict.hidden { color: var(--error-fg); }
.list-empty { padding: var(--sp-2); color: var(--text-secondary); font-size: 12px; }`;

function describe(
  animation: Animation,
  physics: readonly PhysicsConstraintData[],
  conflicts: readonly TrackConflict[],
) {
  const driven = drivenPhysics(animation, physics);
  const events = collectEvents(animation).map((e) => `event: ${e.name}   time: ${e.time.toFixed(3)}`);
  return (
    <>
      {[
        describeAnimation(animation),
        ...(driven.length > 0 ? [`drives physics: ${driven.join(', ')}`] : []),
        ...events,
      ].join('\n')}
      {conflicts.map((c) => (
        <div key={c.track} class={`list-tooltip-conflict${c.hidden ? ' hidden' : ''}`}>
          {describeConflict(c)}
        </div>
      ))}
    </>
  );
}

// One badge per direction, however many tracks clash, so a deep stack cannot
// crowd the row; it names the nearest track and counts the rest, and the
// tooltip still lists every one of them.
function badgeText(tracks: readonly number[]) {
  const [nearest] = tracks;
  return tracks.length > 1 ? `T${nearest} +${tracks.length - 1}` : `T${nearest}`;
}

export function AnimationList({
  animations,
  physics,
  trackAnimations,
  activeTrack,
  onSelect,
}: {
  animations: readonly Animation[];
  physics: readonly PhysicsConstraintData[];
  trackAnimations: readonly (string | null)[];
  activeTrack: number;
  onSelect: (name: string) => void;
}) {
  const byName = new Map(animations.map((a) => [a.name, a]));
  const onTracks = trackAnimations.map((name) => (name === null ? null : (byName.get(name) ?? null)));
  return (
    <div class="panel list-container" data-panel>
      <div class="panel-header">Animations</div>
      {animations.length === 0 && <div class="list-empty">This skeleton has no animations.</div>}
      {animations.map((a) => {
        const conflicts = trackConflicts(a, onTracks, activeTrack);
        // Conflicts come in track order, so the nearest track below is the last
        // of its group and the nearest above is the first.
        const below = conflicts
          .filter((c) => !c.hidden)
          .map((c) => c.track)
          .reverse();
        const above = conflicts.filter((c) => c.hidden).map((c) => c.track);
        return (
          <div
            key={a.name}
            class="list-item"
            onClick={() => onSelect(a.name)}
            data-vscode-context={JSON.stringify({
              webviewSection: 'animationItem',
              animationName: a.name,
              preventDefaultContextMenuItems: true,
            })}
          >
            <button
              type="button"
              class="list-item-copy"
              title={`Copy "${a.name}"`}
              aria-label={`Copy animation name ${a.name}`}
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(a.name);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M4 2h7l3 3v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm0 1v9h9V6h-3V3H4z" />
              </svg>
            </button>
            {/* The tooltip's wrapper is the flex item, so it has to carry the
              shrinking styles itself or a long name pushes the duration out. */}
            <Tooltip class="list-item-name" content={describe(a, physics, conflicts)}>
              <span class="list-item-label">{a.name}</span>
              <span class="list-item-duration">{a.duration.toFixed(3)}s</span>
              {below.length > 0 && <span class="list-item-conflict">{badgeText(below)}</span>}
              {above.length > 0 && <span class="list-item-conflict hidden">{badgeText(above)}</span>}
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}
