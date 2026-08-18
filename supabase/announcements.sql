-- Table "announcements" : corne de brume du modérateur.
-- Un message arrive dans la boîte aux lettres de TOUTE la colonie.
-- L'envoi est fait côté app (ADMIN_PSEUDO dans index.html), comme les questions.
--
-- À exécuter une fois dans Supabase → SQL Editor.

create table if not exists public.announcements (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  body           text not null,
  author_pseudo  text,
  created_at     timestamptz not null default now()
);

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);

alter table public.announcements enable row level security;

drop policy if exists "announcements_select_all" on public.announcements;
drop policy if exists "announcements_insert_all" on public.announcements;
drop policy if exists "announcements_delete_all" on public.announcements;

create policy "announcements_select_all" on public.announcements
  for select using (true);
create policy "announcements_insert_all" on public.announcements
  for insert with check (true);
create policy "announcements_delete_all" on public.announcements
  for delete using (true);

comment on table public.announcements is
  'Messages du modérateur (corne de brume) affichés dans la boîte aux lettres de chacun.';
