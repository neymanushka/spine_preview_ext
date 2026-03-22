const { h } = preact;
const html = htm.bind(h);

export const skinsPanelStyles = `
.skins-container {
    cursor: pointer;
    user-select: none;
    overflow-y: auto;
    align-items: flex-end;
    background: var(--panel-bg);
    border: var(--panel-border);
    border-radius: var(--panel-radius);
    backdrop-filter: blur(12px);
    padding: 4px;
    min-width: 180px;
}
.skin-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: transparent;
    color: var(--text-primary);
    border-radius: 4px;
    padding: 4px 8px;
    transition: background-color 0.15s;
}
.skin-item:hover { background-color: var(--hover-bg); color: white; }
.skin-item:active { background-color: var(--active-bg); }
.skin-item input[type="checkbox"] {
    accent-color: var(--accent);
    cursor: pointer;
}`;

export function SkinsPanel({ skins, activeSkins, onToggle }: {
  skins: SpineSkin[];
  activeSkins: Set<string>;
  onToggle: (name: string) => void;
}) {
  if (skins.length <= 1) return null;

  return html`<div class="skins-container">
    <div class="panel-header">Skins</div>
    ${skins.map(s => html`
      <div key=${s.name} class="skin-item">
        <input type="checkbox" checked=${activeSkins.has(s.name)}
          onChange=${() => onToggle(s.name)} />
        <div class="list-item-right" onClick=${() => onToggle(s.name)}>${s.name}</div>
      </div>
    `)}
  </div>`;
}
