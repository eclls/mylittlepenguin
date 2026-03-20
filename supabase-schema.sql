-- ═══════════════════════════════════════════════════════
--  MYLITTLEPENGUIN — Supabase SQL Schema
--  Colle ce code dans l'éditeur SQL de ton projet Supabase
--  (app.supabase.com → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════

-- ─── PROFILES ───────────────────────────────────────
create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  pseudo           text not null unique,
  start_date       date not null,
  last_kill_date   date,
  kills            int default 0,
  avatar           text default '🐧',
  notif_enabled    boolean default true,
  banquise_public  boolean default true,
  created_at       timestamptz default now()
);

-- RLS
alter table profiles enable row level security;

create policy "Public profiles visible" on profiles
  for select using (true);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- ─── FRIENDSHIPS ────────────────────────────────────
create table if not exists friendships (
  id        uuid primary key default gen_random_uuid(),
  user_a    uuid references profiles(id) on delete cascade,
  user_b    uuid references profiles(id) on delete cascade,
  status    text default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique (user_a, user_b)
);

alter table friendships enable row level security;

create policy "Users can see their friendships" on friendships
  for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Users can create friendship requests" on friendships
  for insert with check (auth.uid() = user_a);

create policy "Users can update friendships they received" on friendships
  for update using (auth.uid() = user_b);

create policy "Users can delete their friendships" on friendships
  for delete using (auth.uid() = user_a or auth.uid() = user_b);

-- ─── MESSAGES ───────────────────────────────────────
create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid references profiles(id) on delete cascade,
  to_id      uuid references profiles(id) on delete cascade,
  text       text,
  animal     text check (animal in ('mouette', 'pingouin', 'orque', null)),
  read       boolean default false,
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "Users can see messages sent to them" on messages
  for select using (auth.uid() = to_id or auth.uid() = from_id);

create policy "Users can send messages" on messages
  for insert with check (auth.uid() = from_id);

create policy "Users can mark their messages read" on messages
  for update using (auth.uid() = to_id);

-- ─── REALTIME ────────────────────────────────────────
-- Active le realtime sur messages pour les notifications live
alter publication supabase_realtime add table messages;
