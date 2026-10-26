import { useCallback, useEffect, useState } from 'react';
import { useMultiplayerPong } from './hooks/useMultiplayerPong';
import { Lobby } from './components/Lobby';
import { ReadyRoom } from './components/ReadyRoom';
import { PongGame } from './components/PongGame';
import { GameOver } from './components/GameOver';
import { ControlsDialog } from './components/ControlsDialog';

export default function App() {
  const {
    appState, playerNumber, winner,
    gameStateRef, availableRooms, roomId,
    createRoom, cancelRoom, joinRoom, joinByCode, startGame, onPlayAgain, setTouchDirection,
  } = useMultiplayerPong();

  // One controls dialog for every screen. It closes whenever the screen changes (an opponent joins, the match
  // starts), since every choice in it has already been applied.
  const [controlsOpen, setControlsOpen] = useState(false);
  const openControls = useCallback(() => setControlsOpen(true), []);
  const closeControls = useCallback(() => setControlsOpen(false), []);
  useEffect(() => setControlsOpen(false), [appState]);

  const screen = (() => {
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
          roomId={roomId}
          onCreateRoom={createRoom}
          onCancelRoom={cancelRoom}
          onJoinRoom={joinRoom}
          onJoinByCode={joinByCode}
          onOpenControls={openControls}
        />
      );
    }

    if (appState === 'ready' && playerNumber) {
      return <ReadyRoom playerNumber={playerNumber} onStart={startGame} onOpenControls={openControls} />;
    }

    if (appState === 'playing' && playerNumber) {
      return (
        <PongGame
          gameStateRef={gameStateRef}
          playerNumber={playerNumber}
          onTouchDirection={setTouchDirection}
          onOpenControls={openControls}
        />
      );
    }

    if (appState === 'gameover') {
      return <GameOver winner={winner} playerNumber={playerNumber} onPlayAgain={onPlayAgain} />;
    }

    return null;
  })();

  return (
    <>
      {screen}
      {controlsOpen && <ControlsDialog onClose={closeControls} />}
    </>
  );
}
