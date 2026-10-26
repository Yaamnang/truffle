import { useSyncExternalStore } from 'react';
import { DEFAULT_CONTROL_PREFS, parseControlPrefs, type ControlPrefs } from '../lib/controls';

// One preference shared by every screen: picked on the start screen, it is already in place when the match
// begins, and it is remembered for the next visit. Storage can be missing or throw (private browsing, blocked
// site data); the choice then lasts for this page load only.
const STORAGE_KEY = 'truffle-pong.controls';

function load(): ControlPrefs {
  try {
    return parseControlPrefs(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_CONTROL_PREFS;
  }
}

let prefs: ControlPrefs | null = null;
const listeners = new Set<() => void>();

const getSnapshot = () => (prefs ??= load());

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => { listeners.delete(onChange); };
}

export function setControlPrefs(change: Partial<ControlPrefs>) {
  prefs = { ...getSnapshot(), ...change };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Not persisted; the in-memory value still applies.
  }
  listeners.forEach((listener) => listener());
}

export function useControlPrefs(): ControlPrefs {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_CONTROL_PREFS);
}
