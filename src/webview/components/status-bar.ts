const { h, Fragment } = preact;
const html = htm.bind(h);

export const statusBarStyles = `
.title-container-version { width: 200px; color: var(--text-secondary); font-size: 12px; }
.title-container-time { flex: 1; color: var(--text-secondary); font-size: 12px; }`;

export function StatusBar({ version, updateTime }: {
  version: string;
  updateTime: string;
}) {
  return html`<${Fragment}>
    <div class="title-container-version">spine version: ${version}</div>
    <div class="title-container-time">${updateTime}</div>
  </${Fragment}>`;
}
