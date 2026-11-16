import type { TextureAtlasPage } from '@esotericsoftware/spine-pixi-v8';
import { Tooltip } from './tooltip';

export const statusBarStyles = `
.status-bar {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
}
.status-bar > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.status-bar-stats { min-width: 108px; }
.pma-badge {
    display: inline-block;
    flex-shrink: 0;
    padding: 0 var(--sp-1);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    color: var(--text-primary);
    font-weight: 600;
}
.pma-indicator { flex-shrink: 0; }
.pma-tooltip { white-space: pre-wrap; overflow-wrap: anywhere; }
.pma-badge:focus-visible { outline: 1px solid var(--accent); }
@media (max-width: 800px) {
    .status-bar > span { display: none; }
    .status-bar { flex: 0 0 auto; overflow: visible; }
    .status-bar:not(:has(.pma-badge)) { display: none; }
}`;

export function StatusBar({
  version,
  statsRef,
  texturePages,
}: {
  version: string;
  texturePages: readonly TextureAtlasPage[];
  // Written to directly by the render loop — see the ticker effect in use-preview-frame.ts.
  statsRef: { current: HTMLSpanElement | null };
}) {
  const pmaPages = texturePages.filter((page) => page.pma);
  const description = [
    'Premultiplied alpha',
    `${pmaPages.length} of ${texturePages.length} texture pages used by this skeleton use PMA.`,
    'Includes all skins and sequence frames.',
    ...pmaPages.map((page) => page.name),
  ].join('\n');

  return (
    <div class="status-bar">
      <span title="Spine runtime version the skeleton was exported with">spine {version}</span>
      {pmaPages.length > 0 && (
        <Tooltip class="pma-indicator" content={<div class="pma-tooltip">{description}</div>}>
          {(tooltipId) => (
            <span class="pma-badge" tabIndex={0} aria-label={description} aria-describedby={tooltipId}>
              PMA
            </span>
          )}
        </Tooltip>
      )}
      <span class="status-bar-stats" ref={statsRef} title="Skeleton update cost and render rate" />
    </div>
  );
}
