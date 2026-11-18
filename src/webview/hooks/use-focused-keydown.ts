import { useLayoutEffect } from 'preact/hooks';

// Visibility alone is insufficient: a split preview can remain visible while
// the text editor owns focus. Detach shortcuts until this document is focused.
export function useFocusedKeydown(onKeyDown: (event: KeyboardEvent) => void, enabled = true, capture = false) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.hasFocus() && !document.hidden) onKeyDown(event);
    };
    const detach = () => window.removeEventListener('keydown', handleKeyDown, capture);
    const syncFocus = () => {
      detach();
      if (document.hasFocus() && !document.hidden) window.addEventListener('keydown', handleKeyDown, capture);
    };
    window.addEventListener('focus', syncFocus);
    window.addEventListener('blur', detach);
    document.addEventListener('visibilitychange', syncFocus);
    syncFocus();
    return () => {
      detach();
      window.removeEventListener('focus', syncFocus);
      window.removeEventListener('blur', detach);
      document.removeEventListener('visibilitychange', syncFocus);
    };
  }, [onKeyDown, enabled, capture]);
}
