import { Tooltip } from './tooltip';
import { collectEvents } from '../animation-events';

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
.list-item-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list-item-duration {
    flex-shrink: 0;
    color: var(--text-secondary);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
}
.list-empty { padding: var(--sp-2); color: var(--text-secondary); font-size: 12px; }`;

function describeEvents(animation: SpineAnimation) {
  const events = collectEvents(animation);
  if (events.length === 0) return 'no events found';
  return events.map((e) => `event: ${e.name}   time: ${e.time.toFixed(3)}`).join('\n');
}

export function AnimationList({
  animations,
  onSelect,
}: {
  animations: readonly SpineAnimation[];
  onSelect: (name: string) => void;
}) {
  return (
    <div class="panel list-container" data-panel>
      <div class="panel-header">Animations</div>
      {animations.length === 0 && <div class="list-empty">This skeleton has no animations.</div>}
      {animations.map((a) => (
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
          <Tooltip text={describeEvents(a)}>
            <div class="list-item-name">
              <span class="list-item-label">{a.name}</span>
              <span class="list-item-duration">{a.duration.toFixed(3)}s</span>
            </div>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
