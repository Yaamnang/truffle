import { useState } from 'react';
import type { GameRoom } from '../lib/supabase';

interface Props {
  status: 'home' | 'waiting';
  availableRooms: GameRoom[];
  roomId: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export function Lobby({ status, availableRooms, roomId, onCreateRoom, onJoinRoom }: Props) {
  const [copied, setCopied] = useState(false);
  const code = roomId ? roomId.slice(-6).toUpperCase() : null;

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (status === 'waiting' && code) {
    return (
      <div className="screen">
        <h1 className="title">PONG</h1>
        <p className="searching">Waiting for opponent<span className="dots" /></p>

        <div className="room-share">
          <p className="room-share-label">Your room code</p>
          <div className="room-code">{code}</div>
          <button className="btn btn-sm" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        <p className="hint">Share this code — your friend can find it in the room list</p>
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
