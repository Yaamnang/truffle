import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, type GameRoom } from '../lib/supabase';
import {
  GameState, initialState, stepGame,
  WINNING_SCORE, PADDLE_H, CANVAS_H, PADDLE_SPEED,
} from '../lib/gameEngine';

export type AppState = 'auth' | 'home' | 'waiting' | 'playing' | 'gameover';

export interface PongHook {
  appState: AppState;
  playerNumber: 1 | 2 | null;
  winner: 1 | 2 | null;
  gameStateRef: React.MutableRefObject<GameState>;
  availableRooms: GameRoom[];
  createRoom: () => void;
  joinRoom: (roomId: string) => void;
  onPlayAgain: () => void;
}

export function useMultiplayerPong(): PongHook {
  const [appState, setAppState] = useState<AppState>('auth');
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);

  const gameStateRef = useRef<GameState>(initialState());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
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
        setAppState('home');
      } else {
        supabase.auth.signInAnonymously().then(({ data, error }) => {
          if (cancelled || error || !data.user) return;
          userIdRef.current = data.user.id;
          setAppState('home');
        });
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Live room list — only active on the home screen
  useEffect(() => {
    if (appState !== 'home') return;

    const fetchRooms = () => {
      supabase
        .from('game_rooms')
        .select('*')
        .eq('status', 'waiting')
        .gt('created_at', new Date(Date.now() - 120_000).toISOString())
        .order('created_at', { ascending: false })
        .then(({ data }) => setAvailableRooms(data ?? []));
    };

    fetchRooms();

    const ch = supabase
      .channel('lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, fetchRooms)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [appState]);

  const stopGame = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  const setupChannel = useCallback((roomId: string, pNum: 1 | 2) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase.channel(`pong:${roomId}`, {
      config: { broadcast: { self: false } },
    });

    ch
      .on('broadcast', { event: 'state' }, ({ payload }) => {
        if (pNum !== 2 || appStateRef.current !== 'playing') return;
        const received = payload as GameState;
        // Preserve local paddle2Y so movement feels immediate
        gameStateRef.current = { ...received, paddle2Y: gameStateRef.current.paddle2Y };
      })
      .on('broadcast', { event: 'paddle' }, ({ payload }) => {
        if (pNum !== 1 || appStateRef.current !== 'playing') return;
        gameStateRef.current = { ...gameStateRef.current, paddle2Y: (payload as { y: number }).y };
      })
      .on('broadcast', { event: 'game_over' }, ({ payload }) => {
        const w = (payload as { winner: 1 | 2 }).winner;
        stopGame();
        setWinner(w);
        setAppState('gameover');
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        if (appStateRef.current !== 'playing') return;
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

  const startHostLoop = useCallback(() => {
    gameStateRef.current = initialState();

    const loop = (ts: number) => {
      if (appStateRef.current !== 'playing') return;

      const keys = keysRef.current;
      let p1y = gameStateRef.current.paddle1Y;
      if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) p1y = Math.max(0, p1y - PADDLE_SPEED);
      if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) p1y = Math.min(CANVAS_H - PADDLE_H, p1y + PADDLE_SPEED);
      gameStateRef.current = { ...gameStateRef.current, paddle1Y: p1y };

      const { next } = stepGame(gameStateRef.current);
      gameStateRef.current = next;

      if (next.score1 >= WINNING_SCORE || next.score2 >= WINNING_SCORE) {
        const w: 1 | 2 = next.score1 >= WINNING_SCORE ? 1 : 2;
        channelRef.current?.send({ type: 'broadcast', event: 'game_over', payload: { winner: w } });
        if (roomIdRef.current) {
          supabase.from('game_rooms').update({ status: 'finished', winner: w })
            .eq('id', roomIdRef.current).then(() => {});
        }
        setWinner(w);
        setAppState('gameover');
        return;
      }

      if (ts - lastBroadcastRef.current >= 33) {
        channelRef.current?.send({ type: 'broadcast', event: 'state', payload: gameStateRef.current });
        lastBroadcastRef.current = ts;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const createRoom = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;

    const { data: room, error } = await supabase
      .from('game_rooms')
      .insert({ player1_id: userId })
      .select()
      .single();

    if (error || !room) return;

    roomIdRef.current = room.id;
    setPlayerNumber(1);
    playerNumRef.current = 1;
    setAppState('waiting');

    // Watch for player 2 joining
    const watchRoom = supabase
      .channel(`room-watch:${room.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          const updated = payload.new as { status: string; player2_id: string | null };
          if (updated.status === 'playing' && updated.player2_id) {
            setupChannel(room.id, 1);
            setAppState('playing');
            startHostLoop();
            supabase.removeChannel(watchRoom);
          }
        }
      )
      .subscribe();
  }, [setupChannel, startHostLoop]);

  const joinRoom = useCallback(async (roomId: string) => {
    const userId = userIdRef.current;
    if (!userId) return;

    // Atomic join — fails gracefully if another player grabbed it first
    const { data, error } = await supabase
      .from('game_rooms')
      .update({ player2_id: userId, status: 'playing' })
      .eq('id', roomId)
      .is('player2_id', null)
      .eq('status', 'waiting')
      .select()
      .single();

    if (error || !data) {
      // Room was already taken — list will refresh via the lobby subscription
      return;
    }

    roomIdRef.current = data.id;
    setPlayerNumber(2);
    playerNumRef.current = 2;
    setupChannel(data.id, 2);
    setAppState('playing');
  }, [setupChannel]);

  // Player 2 paddle loop — sends position to host
  useEffect(() => {
    if (appState !== 'playing' || playerNumber !== 2) return;
    let rafId: number;
    const loop = () => {
      if (appStateRef.current !== 'playing') return;
      const keys = keysRef.current;
      let p2y = gameStateRef.current.paddle2Y;
      if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) p2y = Math.max(0, p2y - PADDLE_SPEED);
      if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) p2y = Math.min(CANVAS_H - PADDLE_H, p2y + PADDLE_SPEED);
      if (p2y !== gameStateRef.current.paddle2Y) {
        gameStateRef.current = { ...gameStateRef.current, paddle2Y: p2y };
        channelRef.current?.send({ type: 'broadcast', event: 'paddle', payload: { y: p2y } });
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [appState, playerNumber]);

  // Key listeners
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keysRef.current.add(e.key); e.preventDefault(); };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const onPlayAgain = useCallback(() => {
    stopGame();
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    // Clean up the finished room
    if (roomIdRef.current) {
      supabase.from('game_rooms').delete().eq('id', roomIdRef.current).then(() => {});
    }
    gameStateRef.current = initialState();
    setWinner(null);
    setPlayerNumber(null);
    playerNumRef.current = null;
    roomIdRef.current = null;
    setAppState('home');
  }, [stopGame]);

  return { appState, playerNumber, winner, gameStateRef, availableRooms, createRoom, joinRoom, onPlayAgain };
}
