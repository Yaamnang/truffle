import { useEffect, useRef } from 'react';
import { drawGame, CANVAS_W, CANVAS_H, type GameState } from '../lib/gameEngine';

interface Props {
  gameStateRef: React.MutableRefObject<GameState>;
  playerNumber: 1 | 2;
}

export function PongGame({ gameStateRef, playerNumber }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const render = () => {
      drawGame(ctx, gameStateRef.current, playerNumber);
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [gameStateRef, playerNumber]);

  return (
    <div className="game-wrap">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="game-canvas"
      />
      <p className="hint">
        {playerNumber === 1 ? 'Left paddle' : 'Right paddle'} — W / S or ↑ / ↓
      </p>
    </div>
  );
}
