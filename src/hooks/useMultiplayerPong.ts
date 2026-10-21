import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, type GameRoom } from '../lib/supabase';
import { playJoinSound, playStartSound } from '../lib/sounds';
import {
  GameState, initialState, stepGame,
  WINNING_SCORE, STEP_MS, NETWORK_SEND_INTERVAL_MS,
} from '../lib/gameEngine';
import { clampPaddleY, isGameKey, movePaddle, resolveDirection, type Direction } from '../lib/input';

// How long a waiting room stays listed and joinable (the lobby list and join-by-code both use it).
const ROOM_LISTING_MS = 120_000;

export type AppState = 'auth' | 'home' | 'waiting' | 'ready' | 'playing' | 'gameover';

export interface PongHook {
  appState: AppState;
  playerNumber: 1 | 2 | null;
  winner: 1 | 2 | null;
  gameStateRef: React.MutableRefObject<GameState>;
  availableRooms: GameRoom[];
  roomId: string | null;
  createRoom: () => void;
  cancelRoom: () => Promise<void>;
  joinRoom: (roomId: string) => void;
  joinByCode: (code: string) => Promise<'ok' | 'not_found' | 'taken'>;
  startGame: () => void;
  onPlayAgain: () => void;
  setTouchDirection: (dir: Direction) => void;
}

export function useMultiplayerPong(): PongHook {
  const [appState, setAppState] = useState<AppState>('auth');
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const gameStateRef = useRef<GameState>(initialState());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const watchChannelRef = useRef<RealtimeChannel | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const touchDirRef = useRef<Direction>(0);
  const rafRef = useRef<number | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const playerNumRef = useRef<1 | 2 | null>(null);
  const appStateRef = useRef<AppState>('auth');
  const lastBroadcastRef = useRef<number>(0);

  useEffect(() => { appStateRef.current = appState; }, [appState]);
  useEffect(() => { playerNumRef.current = playerNumber; }, [playerNumber]);

  // Anonymous sign-in on mount
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        userIdRef.current = session.user.id;
        setAuthUserId(session.user.id);
      } else {
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (cancelled || error || !data.user) return;
          userIdRef.current = data.user.id;
          setAuthUserId(data.user.id);
        });
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Live room list — only active on the home screen
  useEffect(() => {
    if (appState !== 'home') return;

    let active = true; // a fetch that lands after we leave the home screen must not overwrite the list
    const fetchRooms = () => {
      supabase
        .from('game_rooms')
        .select('*')
        .eq('status', 'waiting')
        .gt('created_at', new Date(Date.now() - ROOM_LISTING_MS).toISOString())
        .order('created_at', { ascending: false })
        .then(({ data }) => { if (active) setAvailableRooms(data ?? []); });
    };

    fetchRooms();

    const ch = supabase
      .channel('lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, fetchRooms)
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [appState]);

  const stopGame = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const startHostLoop = useCallback(() => {
    gameStateRef.current = initialState();

    let accumulator = 0;
    let lastTs = 0;

    const loop = (ts: number) => {
      if (appStateRef.current !== 'playing') return;

      if (lastTs !== 0) accumulator += Math.min(ts - lastTs, 100);
      lastTs = ts;

      let gameOver: 1 | 2 | null = null;

      while (accumulator >= STEP_MS) {
        const p1y = movePaddle(gameStateRef.current.paddle1Y, resolveDirection(keysRef.current, touchDirRef.current));
        gameStateRef.current = { ...gameStateRef.current, paddle1Y: p1y };

        const { next } = stepGame(gameStateRef.current);
        gameStateRef.current = next;
        accumulator -= STEP_MS;

        if (next.score1 >= WINNING_SCORE || next.score2 >= WINNING_SCORE) {
          gameOver = next.score1 >= WINNING_SCORE ? 1 : 2;
          break;
        }
      }

      if (gameOver) {
        channelRef.current?.send({ type: 'broadcast', event: 'game_over', payload: { winner: gameOver } });
        if (roomIdRef.current) {
          supabase.from('game_rooms').update({ status: 'finished', winner: gameOver })
            .eq('id', roomIdRef.current).then(() => {});
        }
        setWinner(gameOver);
        setAppState('gameover');
        return;
      }

      if (ts - lastBroadcastRef.current >= NETWORK_SEND_INTERVAL_MS) {
        channelRef.current?.send({ type: 'broadcast', event: 'state', payload: gameStateRef.current });
        lastBroadcastRef.current = ts;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const setupChannel = useCallback((roomId: string, pNum: 1 | 2) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase.channel(`pong:${roomId}`, {
      config: { broadcast: { self: false } },
    });

    ch
      .on('broadcast', { event: 'game_start' }, () => {
        // Player 2 receives this when host clicks Start Game
        if (pNum !== 2) return;
        appStateRef.current = 'playing';
        setAppState('playing');
      })
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        if (pNum !== 2 || appStateRef.current !== 'playing') return;
        const received = payload as GameState;
        gameStateRef.current = { ...received, paddle2Y: gameStateRef.current.paddle2Y };
      })
      .on('broadcast', { event: 'paddle' }, ({ payload }) => {
        if (pNum !== 1 || appStateRef.current !== 'playing') return;
        // Never trust the remote value: a modified client could send NaN or an off-screen position.
        const y = (payload as { y?: unknown }).y;
        if (typeof y !== 'number' || !Number.isFinite(y)) return;
        gameStateRef.current = { ...gameStateRef.current, paddle2Y: clampPaddleY(y) };
      })
      .on('broadcast', { event: 'game_over' }, ({ payload }) => {
        const w = (payload as { winner: 1 | 2 }).winner;
        stopGame();
        setWinner(w);
        setAppState('gameover');
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (appStateRef.current !== 'playing' && appStateRef.current !== 'ready') return;
        const myId = userIdRef.current;
        const opponentLeft = (leftPresences as unknown as Array<{ userId: string }>)
          .some(p => p.userId !== myId);
        if (opponentLeft) {
          stopGame();
          setWinner(playerNumRef.current as 1 | 2);
          setAppState('gameover');
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await ch.track({ userId: userIdRef.current });
      });

    channelRef.current = ch;
  }, [stopGame]);

  // Player 1 is in a room that is waiting for an opponent (just created, or picked up again after a reload)
  const enterWaiting = useCallback((id: string) => {
    roomIdRef.current = id;
    setRoomId(id);
    setPlayerNumber(1);
    playerNumRef.current = 1;
    setAppState('waiting');

    // Watch for player 2 joining
    const watchRoom = supabase
      .channel(`room-watch:${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${id}` },
        (payload) => {
          const updated = payload.new as { status: string; player2_id: string | null };
          if (updated.status === 'playing' && updated.player2_id) {
            playJoinSound();
            setupChannel(id, 1);
            setAppState('ready');
            supabase.removeChannel(watchRoom);
            watchChannelRef.current = null;
          }
        }
      )
      .subscribe();

    watchChannelRef.current = watchRoom;
  }, [setupChannel]);

  const createRoom = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;

    const { data: room, error } = await supabase
      .from('game_rooms')
      .insert({ player1_id: userId })
      .select()
      .single();

    if (error || !room) return;

    enterWaiting(room.id);
  }, [enterWaiting]);

  // First screen after sign-in. A reload (phone tab discarded while switching to a chat app to send the
  // code, screen lock, dev-server restart) wipes the app state but not the room, so pick up a room of ours
  // that is still waiting and joinable instead of leaving it open with nobody watching it.
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;

    supabase
      .from('game_rooms')
      .select('*')
      .eq('player1_id', authUserId)
      .eq('status', 'waiting')
      .is('player2_id', null)
      .gt('created_at', new Date(Date.now() - ROOM_LISTING_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        const room = data?.[0];
        if (room) enterWaiting(room.id);
        else setAppState('home');
      });

    return () => { cancelled = true; };
  }, [authUserId, enterWaiting]);

  // Player 1 gives up while waiting. The room is closed with a conditional update (there is no delete
  // policy), which only matches while nobody has joined: if an opponent got in first the update matches
  // nothing, we stay put, and the room watcher moves us on to the ready screen.
  const cancelRoom = useCallback(async () => {
    const id = roomIdRef.current;
    if (!id || playerNumRef.current !== 1 || appStateRef.current !== 'waiting') return;

    const { data, error } = await supabase
      .from('game_rooms')
      .update({ status: 'finished' })
      .eq('id', id)
      .eq('status', 'waiting')
      .is('player2_id', null)
      .select();

    if (!error && (data?.length ?? 0) === 0) return;

    if (watchChannelRef.current) { supabase.removeChannel(watchChannelRef.current); watchChannelRef.current = null; }
    roomIdRef.current = null;
    setRoomId(null);
    setAvailableRooms((rooms) => rooms.filter((r) => r.id !== id));
    setPlayerNumber(null);
    playerNumRef.current = null;
    setAppState('home');
  }, []);

  const joinRoom = useCallback(async (roomId: string) => {
    const userId = userIdRef.current;
    if (!userId) return;

    const { data, error } = await supabase
      .from('game_rooms')
      .update({ player2_id: userId, status: 'playing' })
      .eq('id', roomId)
      .is('player2_id', null)
      .eq('status', 'waiting')
      .select()
      .single();

    if (error || !data) return;

    playJoinSound();
    roomIdRef.current = data.id;
    setPlayerNumber(2);
    playerNumRef.current = 2;
    setupChannel(data.id, 2);
    setAppState('ready');
  }, [setupChannel]);

  const joinByCode = useCallback(async (code: string): Promise<'ok' | 'not_found' | 'taken'> => {
    const userId = userIdRef.current;
    if (!userId) return 'not_found';
    const normalizedCode = code.trim().toLowerCase();

    // Postgres cannot apply ilike directly to a uuid column, so fetch the
    // small active waiting set and match the user-facing suffix client-side.
    const { data: rooms, error: roomsError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('status', 'waiting')
      .gt('created_at', new Date(Date.now() - ROOM_LISTING_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (roomsError || !rooms) return 'not_found';

    const room = rooms.find(({ id }) => id.toLowerCase().endsWith(normalizedCode));
    if (!room) return 'not_found';

    const { data, error } = await supabase
      .from('game_rooms')
      .update({ player2_id: userId, status: 'playing' })
      .eq('id', room.id)
      .is('player2_id', null)
      .eq('status', 'waiting')
      .select()
      .single();

    if (error || !data) return 'taken';

    playJoinSound();
    roomIdRef.current = data.id;
    setRoomId(data.id);
    setPlayerNumber(2);
    playerNumRef.current = 2;
    setupChannel(data.id, 2);
    setAppState('ready');
    return 'ok';
  }, [setupChannel]);

  // Player 1 clicks Start Game
  const startGame = useCallback(() => {
    if (playerNumRef.current !== 1) return;
    // Update ref synchronously so the loop's guard check passes immediately
    playStartSound();
    appStateRef.current = 'playing';
    setAppState('playing');
    channelRef.current?.send({ type: 'broadcast', event: 'game_start', payload: {} });
    startHostLoop();
  }, [startHostLoop]);

  // Player 2 paddle loop — moves in fixed steps (same speed as the host at any refresh rate)
  // and sends the latest position to the host at a capped rate
  useEffect(() => {
    if (appState !== 'playing' || playerNumber !== 2) return;
    let rafId: number;
    let accumulator = 0;
    let lastTs = 0;
    let lastSentY = gameStateRef.current.paddle2Y;
    let lastSentAt = 0;

    const loop = (ts: number) => {
      if (appStateRef.current !== 'playing') return;

      if (lastTs !== 0) accumulator += Math.min(ts - lastTs, 100);
      lastTs = ts;

      while (accumulator >= STEP_MS) {
        const p2y = movePaddle(gameStateRef.current.paddle2Y, resolveDirection(keysRef.current, touchDirRef.current));
        gameStateRef.current = { ...gameStateRef.current, paddle2Y: p2y };
        accumulator -= STEP_MS;
      }

      // Compare against the last value sent (not the last frame), so the final position
      // is still delivered after the paddle stops, even if that frame was throttled out.
      const y = gameStateRef.current.paddle2Y;
      if (y !== lastSentY && ts - lastSentAt >= NETWORK_SEND_INTERVAL_MS) {
        channelRef.current?.send({ type: 'broadcast', event: 'paddle', payload: { y } });
        lastSentY = y;
        lastSentAt = ts;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [appState, playerNumber]);

  // Key listeners
  useEffect(() => {
    // Only claim the game keys while playing, so typing in the room-code field still works.
    const down = (e: KeyboardEvent) => {
      if (appStateRef.current !== 'playing' || !isGameKey(e.key)) return;
      keysRef.current.add(e.key);
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    // A key released while the window is unfocused never fires keyup, which would leave the paddle moving.
    const clearKeys = () => keysRef.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  const onPlayAgain = useCallback(() => {
    stopGame();
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (roomIdRef.current) {
      supabase.from('game_rooms').delete().eq('id', roomIdRef.current).then(() => {});
    }
    gameStateRef.current = initialState();
    setWinner(null);
    setPlayerNumber(null);
    playerNumRef.current = null;
    roomIdRef.current = null;
    setRoomId(null);
    setAppState('home');
  }, [stopGame]);

  const setTouchDirection = useCallback((dir: Direction) => { touchDirRef.current = dir; }, []);

  return {
    appState, playerNumber, winner, gameStateRef, availableRooms, roomId,
    createRoom, cancelRoom, joinRoom, joinByCode, startGame, onPlayAgain, setTouchDirection,
  };
}
