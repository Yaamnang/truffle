import { useCoarsePointer } from '../hooks/useCoarsePointer';
import { ControlsButton } from './ControlsButton';

interface Props {
  playerNumber: 1 | 2;
  onStart: () => void;
  onOpenControls: () => void;
}

export function ReadyRoom({ playerNumber, onStart, onOpenControls }: Props) {
  const touch = useCoarsePointer();

  return (
    <div className="screen ready-screen">
      <h1 className="title">PONG</h1>

      <div className="ready-badge">
        <span className="ready-dot" />
        Both players connected
      </div>

      {playerNumber === 1 ? (
        <>
          <button className="btn" onClick={onStart}>Start Game</button>
          <p className="hint">You are the left paddle</p>
        </>
      ) : (
        <>
          <p className="searching">Waiting for host to start<span className="dots" /></p>
          <p className="hint">You are the right paddle</p>
        </>
      )}

      {touch && <ControlsButton onOpen={onOpenControls} />}
    </div>
  );
}
