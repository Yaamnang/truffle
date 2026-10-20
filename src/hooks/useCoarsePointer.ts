import { useSyncExternalStore } from 'react';

// Primary input is a finger, not a mouse. Hybrid laptops (touchscreen + keyboard) report a fine pointer,
// so they keep the keyboard hint and no on-screen buttons.
const QUERY = '(pointer: coarse)';

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;

export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
