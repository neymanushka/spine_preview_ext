import { sliderToZoom, zoomToSlider } from '../zoom';

export const BACKGROUNDS = [
  { id: 'checker', label: 'Checkerboard' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
  { id: 'theme', label: 'Editor background' },
] as const;

export type BackgroundId = (typeof BACKGROUNDS)[number]['id'];

const SLIDER_STEP = 0.001;

export const controlsStyles = `
.controls {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    flex-shrink: 0;
}
.controls-zoom {
    -webkit-appearance: none;
    appearance: none;
    width: 110px;
    height: 4px;
    background: var(--input-bg);
    border: 1px solid var(--input-border-color);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
}
.controls-zoom::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
}
.controls-reset {
    min-width: 48px;
    padding: 2px var(--sp-1);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
}
.controls-reset:hover {
    background: var(--vscode-toolbar-hoverBackground, var(--hover-bg));
    color: var(--text-primary);
}
.bg-switch { display: flex; gap: 2px; }
.bg-swatch {
    width: 18px;
    height: 18px;
    padding: 0;
    border: 1px solid var(--input-border-color);
    border-radius: var(--radius);
    cursor: pointer;
}
.bg-swatch:hover { border-color: var(--accent); }
.bg-swatch.is-active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.bg-swatch-checker {
    background-color: #8a8a8a;
    background-image:
        linear-gradient(45deg, #6e6e6e 25%, transparent 25%, transparent 75%, #6e6e6e 75%),
        linear-gradient(45deg, #6e6e6e 25%, transparent 25%, transparent 75%, #6e6e6e 75%);
    background-size: 8px 8px;
    background-position: 0 0, 4px 4px;
}
.bg-swatch-dark { background: #1e1e1e; }
.bg-swatch-light { background: #f3f3f3; }
.bg-swatch-theme { background: var(--vscode-editor-background, #1e1e1e); }`;

export function Controls({
  zoom,
  onZoom,
  background,
  onBackground,
  onResetView,
}: {
  zoom: number;
  onZoom: (value: number) => void;
  background: BackgroundId;
  onBackground: (value: BackgroundId) => void;
  onResetView: () => void;
}) {
  return (
    <div class="controls">
      <div class="bg-switch" role="group" aria-label="Canvas background">
        {BACKGROUNDS.map((bg) => (
          <button
            key={bg.id}
            type="button"
            class={`bg-swatch bg-swatch-${bg.id}${background === bg.id ? ' is-active' : ''}`}
            title={bg.label}
            aria-label={bg.label}
            aria-pressed={background === bg.id}
            onClick={() => onBackground(bg.id)}
          />
        ))}
      </div>
      <input
        class="controls-zoom"
        type="range"
        min="0"
        max="1"
        step={SLIDER_STEP}
        value={zoomToSlider(zoom)}
        aria-label="Zoom"
        onInput={(e) => onZoom(sliderToZoom(parseFloat((e.target as HTMLInputElement).value)))}
      />
      <button
        type="button"
        class="controls-reset"
        title="Reset zoom and pan (double-click the canvas)"
        onClick={onResetView}
      >
        {Math.round(zoom * 100)}%
      </button>
    </div>
  );
}
