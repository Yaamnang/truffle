// User-facing control hints, kept together so they can be localized later.
export const controlsHint = (touch: boolean) =>
  touch ? 'Hold ▲ or ▼ to move your paddle' : 'W / S or ↑ / ↓ to move your paddle';

export const gameHint = (touch: boolean, playerNumber: 1 | 2) => {
  const side = playerNumber === 1 ? 'Left paddle' : 'Right paddle';
  return `${side} — ${touch ? 'hold ▲ or ▼' : 'W / S or ↑ / ↓'}`;
};

// Button above the on-screen buttons that moves them to the other side of the court. The visible label names
// the side they are on now; the accessible name repeats it and says what a tap does.
export const controlSideLabel = (side: 'left' | 'right') => (side === 'left' ? 'Left side' : 'Right side');
export const controlSideAriaLabel = (side: 'left' | 'right') =>
  `Controls are on the ${side}. Tap to move them to the ${side === 'left' ? 'right' : 'left'}.`;
