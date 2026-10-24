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
.track-active .track-animation { color: inherit; }
.track-clear {
    display: flex;
    flex-shrink: 0;
    padding: 2px;
    background: none;
    border: none;
    border-radius: var(--radius);
    color: inherit;
    cursor: pointer;
    opacity: 0;
}
.track-item:hover .track-clear { opacity: 1; }
.track-clear:focus-visible { opacity: 1; }
.track-clear:hover { background: var(--vscode-toolbar-hoverBackground, var(--hover-bg)); }
/* Kept in the layout on empty tracks so every name lines up on the right. */
.track-clear:disabled { visibility: hidden; }`;

const EMPTY_TRACK = '—';

// One free track after the last one in use, so a new layer can always be
// started. The list therefore grows by one each time that free track is used,
// and only tracks that hold something or are next in line are ever listed.
const FREE_TRACKS = 1;

export function TracksPanel({
  activeTrack,
  trackAnimations,
  onSelect,
  onClear,
}: {
  activeTrack: number;
  trackAnimations: readonly (string | null)[];
  onSelect: (track: number) => void;
  onClear: (track: number) => void;
}) {
  return (
    <div class="panel tracks-container" data-panel>
      <div class="panel-header">Tracks</div>
      {Array.from({ length: trackAnimations.length + FREE_TRACKS }, (_, i) => {
        const animationName = trackAnimations[i] ?? null;
        return (
          <label key={i} class={`track-item${activeTrack === i ? ' track-active' : ''}`}>
            <input type="radio" name="track" checked={activeTrack === i} onChange={() => onSelect(i)} />
            <span class="track-label">Track {i}</span>
            <span class="track-animation" title={animationName ?? undefined}>
              {animationName ?? EMPTY_TRACK}
            </span>
            <button
              type="button"
              class="track-clear"
              title={animationName ? `Remove "${animationName}" from track ${i}` : undefined}
              aria-label={`Clear track ${i}`}
              disabled={animationName === null}
              onClick={(e) => {
                // Inside the label, so the click must not also select the track.
                e.preventDefault();
                e.stopPropagation();
                onClear(i);
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M4.3 3.6 8 7.3l3.7-3.7.7.7L8.7 8l3.7 3.7-.7.7L8 8.7l-3.7 3.7-.7-.7L7.3 8 3.6 4.3z" />
              </svg>
            </button>
          </label>
        );
      })}
    </div>
  );
}
