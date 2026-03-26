import { Tooltip } from './tooltip';

const { h } = preact;
const html = htm.bind(h);

export const animationListStyles = `
.list-container {
    cursor: pointer;
    user-select: none;
    overflow-y: auto;
    background: var(--panel-bg);
    border: var(--panel-border);
    border-radius: var(--panel-radius);
    backdrop-filter: blur(12px);
    padding: 4px;
    min-width: 220px;
}
.list-item {
    display: flex;
    align-items: center;
    background-color: transparent;
    color: var(--text-primary);
    border-radius: 4px;
    padding: 4px 6px;
    transition: background-color 0.15s;
}
.list-item-left { width: 24px; cursor: grab; text-align: center; flex-shrink: 0; }
.list-item-right { flex: 1; padding: 2px 4px; }
.list-item:hover { background-color: var(--hover-bg); color: white; }
.list-item:active { background-color: var(--active-bg); }
.icon::after { content: "\\1F4CB"; font-size: 12px; }`;

export function AnimationList({ animations, onSelect }: {
  animations: SpineAnimation[];
  onSelect: (name: string) => void;
}) {
  const getEvents = (anim: SpineAnimation) => {
    const text = anim.timelines
      .filter((t): t is SpineTimeline & { events: SpineEvent[] } => 'events' in t)
      .flatMap(e => e.events)
      .map(e => `event: ${e.data.name}   time: ${e.time.toFixed(3)}`)
      .join('\n');
    return text.length > 0 ? text : 'no events found';
  };

  return html`<div class="list-container">
    <div class="panel-header">Animations</div>
    ${animations.map(a => html`
      <div key=${a.name} class="list-item" onClick=${() => onSelect(a.name)}
        data-vscode-context=${JSON.stringify({ webviewSection: 'animationItem', animationName: a.name, preventDefaultContextMenuItems: true })}>
        <a class="list-item-left icon" onClick=${(e: MouseEvent) => { e.stopPropagation(); navigator.clipboard.writeText(a.name); }}></a>
        <${Tooltip} text=${getEvents(a)}>
          <div class="list-item-right">
            ${a.name}   [${a.duration.toFixed(3)}]
          </div>
        </${Tooltip}>
      </div>
    `)}
  </div>`;
}
