# Truffle Pong — Setup

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the dashboard, go to **Settings → API** and copy your **Project URL** and **anon / public** key.

## 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Apply the database migration

In the Supabase dashboard, go to **SQL Editor** and run the contents of:

```
supabase/migrations/001_initial.sql
```

## 4. Enable Anonymous Auth

In the Supabase dashboard:
1. Go to **Authentication → Providers**
2. Enable **Anonymous sign-ins**

## 5. Enable Realtime

In the Supabase dashboard:
1. Go to **Database → Replication**
2. Make sure `game_rooms` is listed under the `supabase_realtime` publication (the migration adds it, but verify it's there)

## 6. Run the app

```bash
npm install
npm run dev
```

Open two browser tabs (or two different browsers) and click **Find Match** in each — they will be paired together.

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Move paddle up |
| S / ↓ | Move paddle down |

## How it works

- **Matchmaking**: The first player creates a room in Supabase. The second player finds and joins it atomically (handles race conditions).
- **Real-time**: Player 1 (left paddle) runs the physics simulation locally and broadcasts game state to Player 2 at ~30fps via Supabase Realtime Broadcast channels. Player 2 broadcasts their paddle position back.
- **Auth**: Both players get an anonymous Supabase session automatically — no sign-up needed.
- **Win condition**: First to 7 points wins.
