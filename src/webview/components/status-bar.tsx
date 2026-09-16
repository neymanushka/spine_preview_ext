export const statusBarStyles = `
.status-bar {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex: 1;
    min-width: 0;
    color: var(--text-secondary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
}
.status-bar > span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.status-bar-stats { min-width: 108px; }`;

export function StatusBar({
  version,
  statsRef,
}: {
  version: string;
  // Written to directly by the render loop — see the ticker effect in app.tsx.
  statsRef: { current: HTMLSpanElement | null };
}) {
  return (
    <div class="status-bar">
      <span title="Spine runtime version the skeleton was exported with">spine {version}</span>
      <span class="status-bar-stats" ref={statsRef} title="Skeleton update cost and render rate" />
    </div>
  );
}
