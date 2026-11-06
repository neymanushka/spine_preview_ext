export const metricRowStyles = `
.metric-list { margin: 0; font-variant-numeric: tabular-nums; }
.metric-row { display: flex; justify-content: space-between; gap: var(--sp-3); margin: var(--sp-2) 0; }
.metric-row dd { margin: 0; font-weight: 600; white-space: nowrap; }
.metric-maximum { color: var(--text-secondary); font-weight: 400; }
`;

export function MetricRow({
  label,
  hint,
  current,
  maximum,
  maximumHint,
  digits,
  unit = '',
}: {
  label: string;
  hint?: string;
  current: number | null;
  maximum: number | null;
  maximumHint: string;
  digits?: number;
  unit?: string;
}) {
  const format = (value: number | null) =>
    value === null ? '—' : `${digits === undefined ? value : value.toFixed(digits)}${unit ? ` ${unit}` : ''}`;

  return (
    <div class="metric-row">
      <dt title={hint}>{label}</dt>
      <dd>
        {format(current)}
        <span class="metric-maximum" title={maximumHint}>
          {' '}
          · {format(maximum)}
        </span>
      </dd>
    </div>
  );
}
