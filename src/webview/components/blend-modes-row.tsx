import { BlendMode } from '@esotericsoftware/spine-pixi-v8';
import type { BlendModeGroup } from '../blend-mode-stats';
import { Tooltip } from './tooltip';

export const blendModesRowStyles = `
.blend-mode-row { flex-wrap: wrap; }
.blend-mode-row dd { min-width: 0; white-space: normal; }
.blend-mode-summary { padding: 0; border: none; background: none; color: inherit; font: inherit; text-align: left; cursor: help; }
.blend-mode-tooltip { white-space: normal; overflow-wrap: anywhere; }
`;

export function BlendModesRow({ groups }: { groups: readonly BlendModeGroup[] | null }) {
  const summary = groups?.map(({ label, slots }) => `${label} ${slots.length}`).join(' · ') || 'None';
  const nonNormalGroups = groups?.filter(({ mode }) => mode !== BlendMode.Normal);

  return (
    <div class="metric-row blend-mode-row">
      <dt>Blend modes</dt>
      <dd>
        <Tooltip
          content={
            <div class="blend-mode-tooltip">
              <div>Rendered slots in the current pose, grouped by blend mode.</div>
              {nonNormalGroups?.map(({ mode, label, slots }) => (
                <div key={mode}>
                  {label}: {slots.join(', ')}
                </div>
              ))}
            </div>
          }
        >
          {(tooltipId) => (
            <button type="button" class="blend-mode-summary" aria-describedby={tooltipId}>
              {groups === null ? '—' : summary}
            </button>
          )}
        </Tooltip>
      </dd>
    </div>
  );
}
