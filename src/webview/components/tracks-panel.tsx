export const TRACK_COUNT = 5;

export const tracksPanelStyles = `
.tracks-container {
    user-select: none;
    overflow-y: auto;
    padding: var(--sp-1);
    min-width: 180px;
}
.track-item {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    color: var(--text-primary);
    border-radius: var(--radius);
    padding: var(--sp-1) var(--sp-2);
    cursor: pointer;
    transition: background-color 0.15s;
}
.track-item:hover { background-color: var(--hover-bg); }
.track-item.track-active { background-color: var(--active-bg); color: var(--active-fg); }
.track-item input { accent-color: var(--accent); cursor: pointer; margin: 0; }
.track-label { white-space: nowrap; }
.track-animation {
    flex: 1;
    min-width: 0;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-secondary);
}
.track-active .track-animation { color: inherit; }`;

const EMPTY_TRACK = '—';

export function TracksPanel({
  activeTrack,
  trackAnimations,
  onSelect,
}: {
  activeTrack: number;
  trackAnimations: readonly (string | null)[];
  onSelect: (track: number) => void;
}) {
  return (
    <div class="panel tracks-container" data-panel>
      <div class="panel-header">Tracks</div>
      {Array.from({ length: TRACK_COUNT }, (_, i) => {
        const animationName = trackAnimations[i] ?? null;
        return (
          <label key={i} class={`track-item${activeTrack === i ? ' track-active' : ''}`}>
            <input type="radio" name="track" checked={activeTrack === i} onChange={() => onSelect(i)} />
            <span class="track-label">Track {i}</span>
            <span class="track-animation" title={animationName ?? undefined}>
              {animationName ?? EMPTY_TRACK}
            </span>
          </label>
        );
      })}
    </div>
  );
}
