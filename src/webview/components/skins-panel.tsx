import type { Skin } from '@esotericsoftware/spine-pixi-v8';

export const skinsPanelStyles = `
.skin-item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`;

export function SkinsPanel({
  skins,
  activeSkins,
  onToggle,
}: {
  skins: readonly Skin[];
  activeSkins: ReadonlySet<string>;
  onToggle: (name: string) => void;
}) {
  if (skins.length <= 1) return null;

  return (
    <div class="panel ui-list-panel skins-container" data-panel>
      <div class="panel-header">Skins</div>
      {skins.map((s) => (
        <label key={s.name} class="ui-choice-row skin-item">
          <input type="checkbox" checked={activeSkins.has(s.name)} onChange={() => onToggle(s.name)} />
          <span class="skin-item-name">{s.name}</span>
        </label>
      ))}
    </div>
  );
}
