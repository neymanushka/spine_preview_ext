const { h, Fragment } = preact;
const html = htm.bind(h);

export const controlsStyles = `
input[type="range"] {
    -webkit-appearance: none;
    height: 4px;
    background: var(--input-bg);
    border: var(--input-border);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
}
input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent);
    border: none;
    cursor: pointer;
}
input[type="range"]::-webkit-slider-thumb:hover { background: #81d4fa; }
label {
    color: var(--text-secondary);
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
}
label input[type="checkbox"] {
    accent-color: var(--accent);
    cursor: pointer;
}`;

export function Controls({ zoom, onZoom, loop, onLoop }: {
  zoom: number;
  onZoom: (value: number) => void;
  loop: boolean;
  onLoop: (value: boolean) => void;
}) {
  return html`<${Fragment}>
    <input type="range" min="0.1" max="1" step="0.025" value=${zoom}
      onInput=${(e: Event) => onZoom(parseFloat((e.target as HTMLInputElement).value))} />
    <label>loop: <input type="checkbox" checked=${loop}
      onChange=${(e: Event) => onLoop((e.target as HTMLInputElement).checked)} /></label>
  </${Fragment}>`;
}
