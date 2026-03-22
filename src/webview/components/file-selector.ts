const { h } = preact;
const html = htm.bind(h);

export const fileSelectorStyles = `
select {
    cursor: pointer;
    background: #fff;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    color: #000;
    font-weight: 500;
    padding: 4px 8px;
    font-size: 13px;
    outline: none;
}
select:hover { border-color: var(--accent); }
select:focus { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }`;

export function FileSelector({ files, selected, onChange }: {
  files: Array<{ name: string }>;
  selected: string;
  onChange: (value: string) => void;
}) {
  return html`<select onChange=${(e: Event) => onChange((e.target as HTMLSelectElement).value)}>
    ${files.map(f => html`<option key=${f.name} value=${f.name} selected=${f.name === selected}>${f.name}</option>`)}
  </select>`;
}
