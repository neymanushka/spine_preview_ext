const { h } = preact;
const html = htm.bind(h);

export const tracksPanelStyles = `
.tracks-container {
    user-select: none;
    overflow-y: auto;
    background: var(--panel-bg);
    border: var(--panel-border);
    border-radius: var(--panel-radius);
    backdrop-filter: blur(12px);
    padding: 4px;
    min-width: 180px;
}
.track-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: transparent;
    color: var(--text-primary);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    transition: background-color 0.15s;
}
.track-item:hover { background-color: var(--hover-bg); color: white; }
.track-item.track-active { background-color: var(--active-bg); color: white; }
.track-item input[type="radio"] {
    accent-color: var(--accent);
    cursor: pointer;
}`;

const TRACK_COUNT = 5;

export function TracksPanel({ activeTrack, onSelect }: {
  activeTrack: number;
  onSelect: (track: number) => void;
}) {
  return html`<div class="tracks-container">
    <div class="panel-header">Tracks</div>
    ${Array.from({ length: TRACK_COUNT }, (_, i) => html`
      <div key=${i} class="track-item ${activeTrack === i ? 'track-active' : ''}"
        onClick=${() => onSelect(i)}>
        <input type="radio" name="track" checked=${activeTrack === i}
          onChange=${() => onSelect(i)} />
        <span>Track ${i}</span>
      </div>
    `)}
  </div>`;
}
