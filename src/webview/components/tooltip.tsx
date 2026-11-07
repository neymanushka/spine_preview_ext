import { render } from 'preact';
import { useCallback, useId, useLayoutEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

const TOOLTIP_GAP = 8;
let dismissActiveTooltip: (() => void) | undefined;

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
    max-width: 350px;
    overflow: hidden;
}`;

export function Tooltip({
  content,
  class: className,
  children,
}: {
  content: ComponentChildren;
  class?: string;
  children: (tooltipId: string) => ComponentChildren;
}) {
  const id = useId();
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const hide = useCallback(() => setAnchor(null), []);

  useLayoutEffect(
    () => () => {
      if (dismissActiveTooltip === hide) dismissActiveTooltip = undefined;
    },
    [hide],
  );

  useLayoutEffect(() => {
    if (!anchor) return;
    // Each visible tooltip owns its DOM root; another instance cannot clear it.
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(
      <div
        id={id}
        role="tooltip"
        class="tooltip-popup"
        style={{ left: `${anchor.right + TOOLTIP_GAP}px`, top: `${anchor.top}px` }}
      >
        {content}
      </div>,
      container,
    );
    const popup = container.firstElementChild as HTMLElement;
    popup.style.left = `${Math.max(0, Math.min(anchor.right + TOOLTIP_GAP, window.innerWidth - popup.offsetWidth))}px`;
    popup.style.top = `${Math.max(0, Math.min(anchor.top, window.innerHeight - popup.offsetHeight))}px`;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setAnchor(null);
    };
    document.addEventListener('keydown', dismiss, true);
    return () => {
      document.removeEventListener('keydown', dismiss, true);
      render(null, container);
      container.remove();
    };
  }, [anchor, content, id]);

  const show = (event: MouseEvent | FocusEvent) => {
    if (dismissActiveTooltip !== hide) dismissActiveTooltip?.();
    dismissActiveTooltip = hide;
    setAnchor((event.currentTarget as HTMLElement).getBoundingClientRect());
  };
  return (
    <div
      class={className}
      onMouseEnter={show}
      onMouseLeave={(event) => {
        if (!event.currentTarget.querySelector(':focus-visible')) hide();
      }}
      onFocusIn={(event) => {
        if (event.target instanceof HTMLElement && event.target.matches(':focus-visible')) show(event);
      }}
      onFocusOut={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        if (!event.currentTarget.matches(':hover')) setAnchor(null);
      }}
    >
      {children(id)}
    </div>
  );
}
