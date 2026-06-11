import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill in your values.');
}

export const supabase = createClient(url, key);

export type GameRoom = {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  player1_id: string;
  player2_id: string | null;
  winner: number | null;
  created_at: string;
};
