export const skinsPanelStyles = `
.skins-container {
    user-select: none;
    overflow-y: auto;
    padding: var(--sp-1);
    min-width: 180px;
}
.skin-item {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    color: var(--text-primary);
    border-radius: var(--radius);
    padding: var(--sp-1) var(--sp-2);
    cursor: pointer;
    transition: background-color 0.15s;
}
.skin-item:hover { background-color: var(--hover-bg); }
.skin-item input { accent-color: var(--accent); cursor: pointer; margin: 0; }
.skin-item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`;

export function SkinsPanel({
  skins,
  activeSkins,
  onToggle,
}: {
  skins: readonly SpineSkin[];
  activeSkins: ReadonlySet<string>;
  onToggle: (name: string) => void;
}) {
  if (skins.length <= 1) return null;

  return (
    <div class="panel skins-container" data-panel>
      <div class="panel-header">Skins</div>
      {skins.map((s) => (
        <label key={s.name} class="skin-item">
          <input type="checkbox" checked={activeSkins.has(s.name)} onChange={() => onToggle(s.name)} />
          <span class="skin-item-name">{s.name}</span>
        </label>
      ))}
    </div>
  );
}
