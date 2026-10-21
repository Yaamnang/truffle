import { useState } from 'react';
import type { GameRoom } from '../lib/supabase';
import { controlsHint } from '../lib/copy';
import { useCoarsePointer } from '../hooks/useCoarsePointer';

// Room codes are the last 6 hex characters of the room id, so drop anything else (spaces, "#", typos)
// and pasted codes still work.
const normalizeCode = (value: string) => value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 6);

interface Props {
  status: 'home' | 'waiting';
  availableRooms: GameRoom[];
  roomId: string | null;
  onCreateRoom: () => void;
  onCancelRoom: () => Promise<void>;
  onJoinRoom: (roomId: string) => void;
  onJoinByCode: (code: string) => Promise<'ok' | 'not_found' | 'taken'>;
}

export function Lobby({ status, availableRooms, roomId, onCreateRoom, onCancelRoom, onJoinRoom, onJoinByCode }: Props) {
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const touch = useCoarsePointer();

  const displayCode = roomId ? roomId.slice(-6).toUpperCase() : null;

  const handleCopy = () => {
    if (!displayCode) return;
    navigator.clipboard.writeText(displayCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleJoinByCode = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) { setCodeError('Code must be 6 characters'); return; }
    setCodeError('');
    setJoining(true);
    const result = await onJoinByCode(trimmed);
    setJoining(false);
    if (result === 'not_found') setCodeError('Room not found — check the code and try again');
    if (result === 'taken') setCodeError('Room is no longer available');
  };

  const handleCancel = async () => {
    setCancelling(true);
    await onCancelRoom();
    setCancelling(false);
  };

  if (status === 'waiting' && displayCode) {
    return (
      <div className="screen">
        <h1 className="title">PONG</h1>
        <p className="searching">Waiting for opponent<span className="dots" /></p>

        <div className="room-share">
          <p className="room-share-label">Your room code</p>
          <div className="room-code">{displayCode}</div>
          <div className="room-share-actions">
            <button className="btn btn-sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button className="btn btn-sm btn-outline" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        </div>

        <p className="hint">Share this code with your friend</p>
      </div>
    );
  }

  const hasRooms = availableRooms.length > 0;

  return (
    <div className={`screen screen-lobby${hasRooms ? ' has-rooms' : ''}`}>
      <h1 className="title">PONG</h1>

      <section className="lobby-panel lobby-play" aria-label="Play">
        <p className="panel-label">Have a code?</p>
        <div className="code-join">
          <div className="code-join-row">
            <input
              className="code-input"
              type="text"
              placeholder="XXXXXX"
              maxLength={6}
              aria-label="Room code"
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={code}
              enterKeyHint="go"
              onChange={(e) => { setCode(normalizeCode(e.target.value)); setCodeError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleJoinByCode(); }}
            />
            <button className="btn btn-sm" onClick={handleJoinByCode} disabled={joining}>
              {joining ? '...' : 'Join'}
            </button>
          </div>
          {codeError && <p className="code-error" role="alert">{codeError}</p>}
        </div>

        <p className="lobby-divider">or</p>
        <button className="btn" onClick={onCreateRoom}>Create Game</button>

        <p className="hint">{controlsHint(touch)}</p>
      </section>

      {hasRooms && (
        <section className="lobby-panel room-list" aria-label="Open games">
          <p className="panel-label">Open games</p>
          <div className="room-list-rows">
            {availableRooms.map((room) => (
              <div key={room.id} className="room-row">
                <span className="room-id">#{room.id.slice(-6).toUpperCase()}</span>
                <span className="room-status">waiting</span>
                <button className="btn btn-sm" onClick={() => onJoinRoom(room.id)}>
                  Join
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
