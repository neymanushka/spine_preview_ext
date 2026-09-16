const TRACK_COUNT = 5;

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
.track-item input { accent-color: var(--accent); cursor: pointer; margin: 0; }`;

export function TracksPanel({ activeTrack, onSelect }: { activeTrack: number; onSelect: (track: number) => void }) {
  return (
    <div class="panel tracks-container" data-panel>
      <div class="panel-header">Tracks</div>
      {Array.from({ length: TRACK_COUNT }, (_, i) => (
        <label key={i} class={`track-item${activeTrack === i ? ' track-active' : ''}`}>
          <input type="radio" name="track" checked={activeTrack === i} onChange={() => onSelect(i)} />
          <span>Track {i}</span>
        </label>
      ))}
    </div>
  );
}
