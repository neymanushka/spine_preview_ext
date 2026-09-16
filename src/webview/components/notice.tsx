export const noticeStyles = `
.notice {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: min(460px, calc(100vw - 32px));
    padding: var(--sp-3) var(--sp-3) var(--sp-3);
    text-align: center;
}
.notice-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
}
.notice-detail {
    margin-top: var(--sp-2);
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-secondary);
    overflow-wrap: anywhere;
    white-space: pre-wrap;
}
.notice-error .notice-title { color: var(--error-fg); }
.notice-spinner {
    width: 18px;
    height: 18px;
    margin: 0 auto var(--sp-2);
    border: 2px solid var(--panel-border-color);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: notice-spin 0.8s linear infinite;
}
@keyframes notice-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
    .notice-spinner { animation-duration: 2.4s; }
}`;

export function Notice({
  kind,
  title,
  detail,
}: {
  kind: 'loading' | 'error' | 'empty';
  title: string;
  detail?: string;
}) {
  return (
    <div class={`panel notice notice-${kind}`} data-panel role={kind === 'error' ? 'alert' : 'status'}>
      {kind === 'loading' && <div class="notice-spinner" />}
      <div class="notice-title">{title}</div>
      {detail && <div class="notice-detail">{detail}</div>}
    </div>
  );
}
