// User-facing control hints, kept together so they can be localized later.
export const controlsHint = (touch: boolean) =>
  touch ? 'Hold ▲ or ▼ to move your paddle' : 'W / S or ↑ / ↓ to move your paddle';

export const gameHint = (touch: boolean, playerNumber: 1 | 2) => {
  const side = playerNumber === 1 ? 'Left paddle' : 'Right paddle';
  return `${side} — ${touch ? 'hold ▲ or ▼' : 'W / S or ↑ / ↓'}`;
};
