import { useMultiplayerPong } from './hooks/useMultiplayerPong';
import { Lobby } from './components/Lobby';
import { PongGame } from './components/PongGame';
import { GameOver } from './components/GameOver';

export default function App() {
  const {
    appState, playerNumber, winner,
    gameStateRef, availableRooms,
    createRoom, joinRoom, onPlayAgain,
  } = useMultiplayerPong();

  if (appState === 'auth') {
    return (
      <div className="screen">
        <h1 className="title">PONG</h1>
        <p className="searching">Connecting<span className="dots" /></p>
      </div>
    );
  }

  if (appState === 'home' || appState === 'waiting') {
    return (
      <Lobby
        status={appState}
        availableRooms={availableRooms}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
      />
    );
  }

  if (appState === 'playing' && playerNumber) {
    return <PongGame gameStateRef={gameStateRef} playerNumber={playerNumber} />;
  }

  if (appState === 'gameover') {
    return <GameOver winner={winner} playerNumber={playerNumber} onPlayAgain={onPlayAgain} />;
  }

  return null;
}
