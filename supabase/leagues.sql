-- Ligues entre amis (MyLittlePenguin)
-- Exécuter une fois dans Supabase → SQL Editor après les tables profiles / friendships.
--
-- Si tu as déjà lancé une version cassée, décommente puis exécute les 2 lignes suivantes, puis relance tout le script :
-- drop table if exists public.league_members cascade;
-- drop table if exists public.leagues cascade;

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_normalized text generated always as (lower(trim(name))) stored,
  emoji text not null default '🏆',
  league_type text not null check (league_type in ('innocents', 'luxure')),
  -- profiles.id est du texte dans ce projet (ex. mlp_…), pas uuid
  created_by text not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists leagues_name_normalized_key on public.leagues (name_normalized);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id text not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index if not exists league_members_user_id_idx on public.league_members (user_id);

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

-- L’app utilise la clé anon + des id profil texte (≠ auth.uid()). Politiques ouvertes pour anon/authenticated,
-- comme le reste du client MyLittlePenguin. À resserrer si tu relies auth.users aux profils.
create policy "leagues_select_all" on public.leagues
  for select to anon, authenticated using (true);

create policy "leagues_insert_all" on public.leagues
  for insert to anon, authenticated with check (true);

create policy "leagues_update_all" on public.leagues
  for update to anon, authenticated using (true) with check (true);

create policy "leagues_delete_all" on public.leagues
  for delete to anon, authenticated using (true);

create policy "league_members_select_all" on public.league_members
  for select to anon, authenticated using (true);

create policy "league_members_insert_all" on public.league_members
  for insert to anon, authenticated with check (true);

create policy "league_members_delete_all" on public.league_members
  for delete to anon, authenticated using (true);

comment on table public.leagues is 'Ligues : innocents (max animaux gagne) ou luxure (min animaux gagne)';
comment on column public.leagues.league_type is 'innocents | luxure';
