interface Props {
  playerNumber: 1 | 2;
  onStart: () => void;
}

export function ReadyRoom({ playerNumber, onStart }: Props) {
  return (
    <div className="screen">
      <h1 className="title">PONG</h1>
      <p className="ready-badge">Both players connected</p>

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
    </div>
  );
}
