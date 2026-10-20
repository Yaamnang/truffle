import { useEffect, useRef } from 'react';
import { drawGame, CANVAS_W, CANVAS_H, type GameState } from '../lib/gameEngine';
import type { Direction } from '../lib/input';
import { gameHint } from '../lib/copy';
import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { TouchControls } from './TouchControls';

interface Props {
  gameStateRef: React.MutableRefObject<GameState>;
  playerNumber: 1 | 2;
  onTouchDirection: (dir: Direction) => void;
}

export function PongGame({ gameStateRef, playerNumber, onTouchDirection }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touch = useCoarsePointer();

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
    <div className="game-layout">
      <div className="game-stage">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="game-canvas"
        />
        <p className="hint">{gameHint(touch, playerNumber)}</p>
      </div>
      {touch && <TouchControls onDirectionChange={onTouchDirection} />}
    </div>
  );
}
