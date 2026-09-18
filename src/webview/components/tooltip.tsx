import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

const TOOLTIP_GAP = 8;
const ESTIMATED_TOOLTIP_HEIGHT = 60;

export const tooltipStyles = `
.tooltip-popup {
    position: fixed;
    background: var(--panel-bg);
    border: 1px solid var(--panel-border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--panel-shadow);
    padding: var(--sp-2);
    font-size: 12px;
    line-height: 1.4;
    color: var(--text-primary);
    white-space: pre;
    pointer-events: none;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.15s;
    max-width: 350px;
    overflow: hidden;
}
.tooltip-popup.visible { opacity: 1; }`;

let tooltipContainer: HTMLElement | null = null;
function getTooltipContainer() {
  if (!tooltipContainer) {
    tooltipContainer = document.createElement('div');
    document.body.appendChild(tooltipContainer);
  }
  return tooltipContainer;
}

export function Tooltip({ text, children }: { text: string; children: ComponentChildren }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      render(null, getTooltipContainer());
    };
  }, []);

  useEffect(() => {
    const container = getTooltipContainer();
    if (!visible) {
      render(null, container);
      return;
    }
    render(
      <div class="tooltip-popup visible" style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
        {text}
      </div>,
      container,
    );
  }, [visible, pos, text]);

  const show = (e: MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const tooltipEl = getTooltipContainer().firstElementChild as HTMLElement | null;
    const height = tooltipEl ? tooltipEl.offsetHeight : ESTIMATED_TOOLTIP_HEIGHT;
    const y = rect.top + height > window.innerHeight ? rect.bottom - height : rect.top;
    setPos({ x: rect.right + TOOLTIP_GAP, y });
    setVisible(true);
  };

  return (
    <div onMouseEnter={show} onMouseLeave={() => setVisible(false)}>
      {children}
    </div>
  );
}
