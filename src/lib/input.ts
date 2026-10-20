import { CANVAS_H, PADDLE_H, PADDLE_SPEED } from './gameEngine';

export type Direction = -1 | 0 | 1;

const UP_KEYS = ['w', 'W', 'ArrowUp'];
const DOWN_KEYS = ['s', 'S', 'ArrowDown'];

export function isGameKey(key: string): boolean {
  return UP_KEYS.includes(key) || DOWN_KEYS.includes(key);
}

/** Net movement from the held keys; holding both cancels out. */
export function keyboardDirection(keys: ReadonlySet<string>): Direction {
  const up = UP_KEYS.some(k => keys.has(k));
  const down = DOWN_KEYS.some(k => keys.has(k));
  if (up === down) return 0;
  return up ? -1 : 1;
}

/** Keyboard and touch can be used together; opposite inputs cancel out. */
export function resolveDirection(keys: ReadonlySet<string>, touchDir: Direction): Direction {
  return Math.sign(keyboardDirection(keys) + touchDir) as Direction;
}

export function clampPaddleY(y: number): number {
  return Math.min(CANVAS_H - PADDLE_H, Math.max(0, y));
}

/** One fixed step of paddle movement. */
export function movePaddle(y: number, dir: Direction): number {
  return clampPaddleY(y + dir * PADDLE_SPEED);
}
