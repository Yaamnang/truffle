export const CANVAS_W = 800;
export const CANVAS_H = 600;
export const PADDLE_W = 12;
export const PADDLE_H = 90;
export const BALL_R = 8;
export const PADDLE_SPEED = 7;
export const WINNING_SCORE = 7;
// Game logic always advances in fixed 60 Hz steps so speed never depends on the display refresh rate.
export const STEP_MS = 1000 / 60;
// Min gap between realtime messages from one player (~30/s) to stay within Supabase message limits.
export const NETWORK_SEND_INTERVAL_MS = 33;

const BASE_SPEED = 5;
const MAX_SPEED = 14;
const P1_X = 20;
const P2_X = CANVAS_W - 20 - PADDLE_W;

export interface GameState {
  ball: { x: number; y: number; vx: number; vy: number };
  paddle1Y: number;
  paddle2Y: number;
  score1: number;
  score2: number;
}

function launchBall(dir: 1 | -1) {
  const angle = (Math.random() * 0.5 + 0.15) * (Math.random() > 0.5 ? 1 : -1);
  return { x: CANVAS_W / 2, y: CANVAS_H / 2, vx: BASE_SPEED * dir, vy: BASE_SPEED * angle };
}

export function initialState(): GameState {
  return {
    ball: launchBall(Math.random() > 0.5 ? 1 : -1),
    paddle1Y: CANVAS_H / 2 - PADDLE_H / 2,
    paddle2Y: CANVAS_H / 2 - PADDLE_H / 2,
    score1: 0,
    score2: 0,
  };
}

export function stepGame(state: GameState): { next: GameState; scored: 0 | 1 | 2 } {
  const { paddle1Y, paddle2Y, score1, score2 } = state;
  let { x, y, vx, vy } = state.ball;

  x += vx;
  y += vy;

  // Wall bounce
  if (y - BALL_R <= 0) { y = BALL_R; vy = Math.abs(vy); }
  else if (y + BALL_R >= CANVAS_H) { y = CANVAS_H - BALL_R; vy = -Math.abs(vy); }

  // Paddle 1 (left)
  if (vx < 0 && x - BALL_R <= P1_X + PADDLE_W && x + BALL_R >= P1_X
    && y + BALL_R >= paddle1Y && y - BALL_R <= paddle1Y + PADDLE_H) {
    x = P1_X + PADDLE_W + BALL_R;
    const rel = (y - paddle1Y) / PADDLE_H - 0.5;
    vx = Math.abs(vx);
    vy = rel * 12;
    const spd = Math.hypot(vx, vy);
    if (spd < MAX_SPEED) { const f = Math.min(1.06, MAX_SPEED / spd); vx *= f; vy *= f; }
  }

  // Paddle 2 (right)
  if (vx > 0 && x + BALL_R >= P2_X && x - BALL_R <= P2_X + PADDLE_W
    && y + BALL_R >= paddle2Y && y - BALL_R <= paddle2Y + PADDLE_H) {
    x = P2_X - BALL_R;
    const rel = (y - paddle2Y) / PADDLE_H - 0.5;
    vx = -Math.abs(vx);
    vy = rel * 12;
    const spd = Math.hypot(vx, vy);
    if (spd < MAX_SPEED) { const f = Math.min(1.06, MAX_SPEED / spd); vx *= f; vy *= f; }
  }

  if (x < 0) {
    return { next: { ball: launchBall(-1), paddle1Y, paddle2Y, score1, score2: score2 + 1 }, scored: 2 };
  }
  if (x > CANVAS_W) {
    return { next: { ball: launchBall(1), paddle1Y, paddle2Y, score1: score1 + 1, score2 }, scored: 1 };
  }

  return { next: { ...state, ball: { x, y, vx, vy } }, scored: 0 };
}

export function drawGame(ctx: CanvasRenderingContext2D, state: GameState, playerNum: 1 | 2) {
  const { ball, paddle1Y, paddle2Y, score1, score2 } = state;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Center line
  ctx.save();
  ctx.setLineDash([8, 12]);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CANVAS_W / 2, 0);
  ctx.lineTo(CANVAS_W / 2, CANVAS_H);
  ctx.stroke();
  ctx.restore();

  // Scores
  ctx.font = 'bold 52px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(String(score1), CANVAS_W / 2 - 70, 70);
  ctx.fillText(String(score2), CANVAS_W / 2 + 70, 70);

  // "YOU" label
  ctx.font = 'bold 18px "Courier New", monospace'; // still readable when a phone shrinks the canvas to ~60%
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  if (playerNum === 1) {
    ctx.textAlign = 'left';
    ctx.fillText('YOU', P1_X, CANVAS_H - 10);
  } else {
    ctx.textAlign = 'right';
    ctx.fillText('YOU', P2_X + PADDLE_W, CANVAS_H - 10);
  }

  // Paddles
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(P1_X, paddle1Y, PADDLE_W, PADDLE_H, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(P2_X, paddle2Y, PADDLE_W, PADDLE_H, 4);
  ctx.fill();

  // Ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}
