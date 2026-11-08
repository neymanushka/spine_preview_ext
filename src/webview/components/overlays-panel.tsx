import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { OverlayOptions, overlayAvailability } from '../debug-overlays';

export const overlaysPanelStyles = `
.overlays-control { flex-shrink: 0; }
.overlays-button { white-space: nowrap; }
.overlays-button.has-overlays { border-color: var(--accent); }
.overlays-button.is-hidden { color: var(--text-secondary); border-style: dashed; }
.overlays-panel {
    position: fixed;
    top: 58px;
    right: var(--sp-2);
    width: 250px;
    max-width: calc(100vw - 16px);
    max-height: calc(100vh - 74px);
    overflow-y: auto;
    z-index: 3;
    padding-bottom: var(--sp-2);
}
.overlays-option {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    cursor: pointer;
}
.overlays-option:hover:not(:has(input:disabled)) { background: var(--hover-bg); }
.overlays-option:has(input:disabled) { opacity: 0.4; cursor: default; }
.overlays-option input { margin: 0; accent-color: var(--accent); }
.overlays-visibility { margin: var(--sp-2) var(--sp-3) 0; }
.overlays-visibility:disabled { opacity: 0.5; cursor: default; }
`;

const OPTIONS = [
  { id: 'bones', label: 'Bones', hint: 'Bone lengths and joints in the current pose.' },
  {
    id: 'boneNames',
    label: 'Bone names',
    hint: 'Bone lengths and joints with names beside active joints. Text stays the same size when zooming.',
  },
  { id: 'mesh', label: 'Mesh wireframe', hint: 'Triangles of the currently attached meshes.' },
  {
    id: 'hull',
    label: 'Mesh hull',
    hint: 'Outer contours of the currently attached meshes, without internal triangles.',
  },
  { id: 'regions', label: 'Region attachments', hint: 'Outlines of ordinary image attachments in the current pose.' },
  { id: 'clipping', label: 'Clipping', hint: 'Clipping attachment polygons that trim the artwork.' },
  { id: 'paths', label: 'Paths', hint: 'Path attachment curves (orange) and control handles (purple).' },
  {
    id: 'bounds',
    label: 'Bounding boxes',
    hint: 'Bounding box attachments exported from Spine, not the overall artwork bounds.',
  },
  { id: 'origin', label: 'Origin', hint: 'Local (0, 0) of the skeleton. Red: +X (right); green: +Y (up).' },
] as const;

export function OverlaysPanel({
  options,
  hidden,
  available,
  onChange,
  onHiddenChange,
}: {
  options: OverlayOptions;
  hidden: boolean;
  available: ReturnType<typeof overlayAvailability>;
  onChange: (options: OverlayOptions) => void;
  onHiddenChange: (hidden: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const count = Object.values(options).filter(Boolean).length;

  useLayoutEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div
      class="overlays-control"
      ref={root}
      onKeyDown={(event) => {
        // Checkboxes and panel buttons keep their native keyboard behaviour.
        event.stopPropagation();
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
      onFocusOut={(event) => {
        if (event.relatedTarget instanceof Node && !root.current?.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        class={`ui-button overlays-button${count ? ' has-overlays' : ''}${count && hidden ? ' is-hidden' : ''}`}
        aria-expanded={open}
        aria-controls="debug-overlays-panel"
        title="Debug overlays"
        onClick={() => setOpen(!open)}
      >
        Overlays{count > 0 ? ` · ${count}${hidden ? ' hidden' : ''}` : ''} ▾
      </button>
      {open && (
        <div
          ref={panel}
          id="debug-overlays-panel"
          class="panel overlays-panel"
          data-panel
          role="dialog"
          aria-label="Debug overlays"
        >
          <div class="panel-header">Debug overlays</div>
          {OPTIONS.map(({ id, label, hint }) => (
            <label key={id} class="overlays-option" title={hint}>
              <input
                type="checkbox"
                checked={options[id]}
                disabled={id !== 'bones' && id !== 'boneNames' && id !== 'origin' && !available[id]}
                onChange={() => onChange({ ...options, [id]: !options[id] })}
              />
              <span>{label}</span>
            </label>
          ))}
          <button
            type="button"
            class="ui-button overlays-visibility"
            disabled={count === 0}
            onClick={() => onHiddenChange(!hidden)}
          >
            {hidden ? 'Show overlays' : 'Hide overlays'}
          </button>
        </div>
      )}
    </div>
  );
}
