import { useEffect } from 'react';

// A finger lifted while the page is hidden or the app is backgrounded never fires pointerup, so held
// controls let go whenever the page loses focus.
export function useReleaseOnHide(release: () => void) {
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) release(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', release);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', release);
    };
  }, [release]);
}
