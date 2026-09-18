import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

// A short animation looping at 5x speed fires tens of events a second, so the
// queue is capped and consecutive repeats of one name collapse into a counter
// rather than stacking.
const MAX_TOASTS = 6;

export const eventLogStyles = `
.event-log {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    min-height: 0;
    /* The left inset matches the timeline panel's own horizontal padding, so a
       toast lines up with the transport buttons under it rather than with the
       panel edge. */
    padding: 0 var(--sp-3) var(--sp-1);
    overflow: hidden;
}
.event-toast {
    flex-shrink: 0;
    padding: 1px var(--sp-2);
    background: var(--panel-bg);
    border: 1px solid var(--event-marker);
    border-radius: var(--radius);
    box-shadow: var(--panel-shadow);
    color: var(--text-primary);
    font-size: 12px;
    white-space: nowrap;
    /* The toast drops itself when this finishes - see onAnimationEnd below, and
       keep the two in step: shortening the fade without it only stalls the
       removal, it does not make the queue turn over faster. */
    animation: event-toast-rise 1600ms ease-out forwards;
}
.event-toast-count { margin-left: var(--sp-1); color: var(--text-secondary); }
@keyframes event-toast-rise {
    0% { opacity: 0; transform: translateY(8px); }
    10% { opacity: 1; transform: translateY(0); }
    65% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-12px); }
}`;

// The name is what identifies a toast; `id` only exists to key the element, and
// changing it is how a repeat restarts the rise.
type Toast = {
  readonly id: number;
  readonly name: string;
  readonly count: number;
};

export type EventLogHandle = (name: string) => void;

export function EventLog({ handleRef }: { handleRef: { current: EventLogHandle | null } }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const lastId = useRef(0);

  const push = useCallback((name: string) => {
    setToasts((prev) => {
      lastId.current += 1;
      const id = lastId.current;
      const last = prev[prev.length - 1];
      // A fresh id remounts the element, so the repeat replays the animation
      // instead of silently bumping a number that is already fading out.
      if (last?.name === name) return [...prev.slice(0, -1), { id, name, count: last.count + 1 }];
      const next = [...prev, { id, name, count: 1 }];
      return next.slice(Math.max(next.length - MAX_TOASTS, 0));
    });
  }, []);

  const drop = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // The state lives here rather than in <App> on purpose: events arrive from
  // the ticker, and a setState up there would re-render the animation list on
  // every one of them.
  useEffect(() => {
    handleRef.current = push;
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, push]);

  return (
    <div class="event-log">
      {toasts.map((toast) => (
        <div key={toast.id} class="event-toast" onAnimationEnd={() => drop(toast.id)}>
          {toast.name}
          {toast.count > 1 && <span class="event-toast-count">×{toast.count}</span>}
        </div>
      ))}
    </div>
  );
}
