interface Props {
  winner: 1 | 2 | null;
  playerNumber: 1 | 2 | null;
  onPlayAgain: () => void;
}

export function GameOver({ winner, playerNumber, onPlayAgain }: Props) {
  const isWinner = winner !== null && playerNumber !== null && winner === playerNumber;

  return (
    <div className="screen">
      <h1 className="title">{isWinner ? 'YOU WIN' : 'YOU LOSE'}</h1>
      <p className="subtitle">
        {winner ? `Player ${winner} wins!` : 'Game over'}
      </p>
      <button className="btn" onClick={onPlayAgain}>Play Again</button>
    </div>
  );
}
