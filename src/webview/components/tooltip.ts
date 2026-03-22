const { h } = preact;
const { useState, useRef, useEffect } = preactHooks;
const html = htm.bind(h);

export const tooltipStyles = `
.tooltip-popup {
    position: fixed;
    background: var(--panel-bg, #1e1e2e);
    border: var(--panel-border, 1px solid rgba(255,255,255,0.1));
    border-radius: 6px;
    backdrop-filter: blur(12px);
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--text-primary, #cdd6f4);
    white-space: pre;
    pointer-events: none;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.15s;
    max-width: 350px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.tooltip-popup.visible {
    opacity: 1;
}`;

let tooltipContainer: HTMLElement | null = null;
function getTooltipContainer() {
  if (!tooltipContainer) {
    tooltipContainer = document.createElement('div');
    document.body.appendChild(tooltipContainer);
  }
  return tooltipContainer;
}

export function Tooltip({ text, children }: {
  text: string;
  children: VNode;
}) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipRef.current) {
        preact.render(null, getTooltipContainer());
      }
    };
  }, []);

  useEffect(() => {
    const container = getTooltipContainer();
    if (visible) {
      preact.render(
        html`<div class="tooltip-popup visible" style=${{ left: pos.x + 'px', top: pos.y + 'px' }}>
          ${text}
        </div>`,
        container
      );
    } else {
      preact.render(null, container);
    }
  }, [visible, pos, text]);

  const show = (e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.right + 8;
    let y = rect.top;
    const tooltipEl = getTooltipContainer().firstElementChild as HTMLElement | null;
    const estimatedHeight = tooltipEl ? tooltipEl.offsetHeight : 60;
    if (y + estimatedHeight > window.innerHeight) {
      y = rect.bottom - estimatedHeight;
    }
    setPos({ x, y });
    setVisible(true);
  };

  const hide = () => setVisible(false);

  return html`
    <div onMouseEnter=${show} onMouseLeave=${hide}>
      ${children}
    </div>
  `;
}
