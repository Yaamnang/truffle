-- Game rooms table
create table if not exists public.game_rooms (
  id          uuid        primary key default gen_random_uuid(),
  status      text        not null default 'waiting'
                          check (status in ('waiting', 'playing', 'finished')),
  player1_id  uuid        not null,
  player2_id  uuid,
  winner      int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger game_rooms_updated_at
  before update on public.game_rooms
  for each row execute function update_updated_at();

-- Row-level security
alter table public.game_rooms enable row level security;

-- Anyone (including anonymous) can read rooms
create policy "read rooms"
  on public.game_rooms for select
  using (true);

-- Authenticated users (including anonymous auth) can create rooms as player1
create policy "create room"
  on public.game_rooms for insert
  with check (auth.uid() = player1_id);

-- player1 can update their own room; player2 can join a waiting room
create policy "update room"
  on public.game_rooms for update
  using (
    auth.uid() = player1_id
    or auth.uid() = player2_id
    or (player2_id is null and status = 'waiting')
  );

-- Enable realtime for this table
alter publication supabase_realtime add table public.game_rooms;
