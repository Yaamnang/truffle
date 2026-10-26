import type { Direction } from './input';

export type ControlLayout = 'joystick' | 'buttons' | 'split';

export const CONTROL_LAYOUTS: readonly ControlLayout[] = ['joystick', 'buttons', 'split'];

/** How the on-screen controls are arranged. `flipped` mirrors every layout left to right. */
export interface ControlPrefs {
  layout: ControlLayout;
  flipped: boolean;
}

export const DEFAULT_CONTROL_PREFS: ControlPrefs = { layout: 'buttons', flipped: false };

/** Anything stored by an older build, or edited by hand, falls back to the defaults field by field. */
export function parseControlPrefs(raw: string | null): ControlPrefs {
  try {
    const value = raw ? JSON.parse(raw) : null;
    return {
      layout: CONTROL_LAYOUTS.includes(value?.layout) ? value.layout : DEFAULT_CONTROL_PREFS.layout,
      flipped: typeof value?.flipped === 'boolean' ? value.flipped : DEFAULT_CONTROL_PREFS.flipped,
    };
  } catch {
    return DEFAULT_CONTROL_PREFS;
  }
}

// Joystick feel, in CSS pixels of finger travel. Past the deadzone the paddle moves at full speed; the knob
// reaches the end of its track at JOYSTICK_TRAVEL, and dragging further drags the origin along, so reversing
// direction never needs more than JOYSTICK_TRAVEL + JOYSTICK_DEADZONE of movement.
export const JOYSTICK_DEADZONE = 8;
export const JOYSTICK_TRAVEL = 32;

/** Keeps a drag within the stick's travel. */
export function clampJoystick(offset: number): number {
  return Math.max(-JOYSTICK_TRAVEL, Math.min(JOYSTICK_TRAVEL, offset));
}

/** Screen y grows downward, so a negative offset (finger moved up) moves the paddle up. */
export function joystickDirection(offset: number): Direction {
  if (Math.abs(offset) < JOYSTICK_DEADZONE) return 0;
  return offset < 0 ? -1 : 1;
}
