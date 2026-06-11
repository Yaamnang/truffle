import type { GameRoom } from '../lib/supabase';

interface Props {
  status: 'home' | 'waiting';
  availableRooms: GameRoom[];
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export function Lobby({ status, availableRooms, onCreateRoom, onJoinRoom }: Props) {
  if (status === 'waiting') {
    return (
      <div className="screen">
        <h1 className="title">PONG</h1>
        <p className="searching">Waiting for opponent<span className="dots" /></p>
        <p className="hint">Share this page — your room is open</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="title">PONG</h1>

      {availableRooms.length === 0 ? (
        <p className="subtitle">No open games</p>
      ) : (
        <div className="room-list">
          <p className="room-list-label">Open games</p>
          {availableRooms.map((room) => (
            <div key={room.id} className="room-row">
              <span className="room-id">#{room.id.slice(-6).toUpperCase()}</span>
              <span className="room-status">waiting for player</span>
              <button className="btn btn-sm" onClick={() => onJoinRoom(room.id)}>
                Join
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="btn" onClick={onCreateRoom}>Create Game</button>
      <p className="hint">W / S or ↑ / ↓ to move your paddle</p>
    </div>
  );
}
