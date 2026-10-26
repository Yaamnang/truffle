import type { ControlLayout } from './controls';

// User-facing strings, kept together so they can be localized later.
export const keyboardHint = 'W / S or ↑ / ↓ to move your paddle';

export const gameHint = (touch: boolean, playerNumber: 1 | 2) => {
  const side = playerNumber === 1 ? 'Left paddle' : 'Right paddle';
  return `${side} — ${touch ? 'hold ▲ or ▼' : 'W / S or ↑ / ↓'}`;
};

// The controls chooser: the button that opens it, the dialog, and the on-screen controls it configures.
export const controlsCopy = {
  open: 'Controls',
  openLabel: (current: string) => `Controls: ${current}. Change controls`,
  title: 'Controls',
  layoutGroup: 'Layout',
  layouts: {
    joystick: { name: 'Joystick', detail: 'Drag up or down' },
    buttons: { name: 'Buttons', detail: '▲ and ▼ together' },
    split: { name: 'Split', detail: '▲ one side, ▼ the other' },
  } satisfies Record<ControlLayout, { name: string; detail: string }>,
  flip: 'Flip sides',
  done: 'Done',
  up: 'Move paddle up',
  down: 'Move paddle down',
  joystick: 'Paddle joystick: drag up or down to move',
};
