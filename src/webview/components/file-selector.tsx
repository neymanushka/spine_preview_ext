export const fileSelectorStyles = `
.file-selector {
    cursor: pointer;
    max-width: 260px;
    min-width: 0;
    background: var(--vscode-dropdown-background, var(--input-bg));
    color: var(--vscode-dropdown-foreground, var(--input-fg));
    border: 1px solid var(--vscode-dropdown-border, var(--input-border-color));
    border-radius: var(--radius);
    padding: var(--sp-1) var(--sp-2);
    font-family: inherit;
    font-size: inherit;
    outline: none;
}
.file-selector:hover { border-color: var(--accent); }
.file-selector:focus-visible { border-color: var(--accent); outline-offset: 0; }`;

export function FileSelector({
  files,
  selected,
  onChange,
}: {
  files: ReadonlyArray<{ name: string }>;
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      class="file-selector"
      aria-label="Skeleton file"
      value={selected}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
    >
      {files.map((f) => (
        <option key={f.name} value={f.name}>
          {f.name}
        </option>
      ))}
    </select>
  );
}
