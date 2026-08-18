-- Table "questions" : boîte à questions publique modérée.
-- Tout le monde peut poser une question ; seul l'admin (identifié côté app par
-- ADMIN_PSEUDO dans index.html) répond et choisit de publier ou non.
--
-- RLS : politiques ouvertes (anon), comme le reste de l'app. La modération est
-- gérée côté client (l'admin est le seul à voir/éditer les questions en attente).

create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  asker_id     text,                                  -- id du profil qui a posé (peut être null)
  asker_pseudo text,                                  -- pseudo au moment de la question (visible seulement par l'admin)
  question     text not null,
  answer       text,                                  -- réponse de l'admin (null tant que pas répondu)
  published    boolean not null default false,        -- true = visible publiquement dans l'onglet Questions
  created_at   timestamptz not null default now(),
  answered_at  timestamptz
);

create index if not exists questions_published_idx on public.questions (published, created_at desc);

alter table public.questions enable row level security;

drop policy if exists "questions_select_all" on public.questions;
drop policy if exists "questions_insert_all" on public.questions;
drop policy if exists "questions_update_all" on public.questions;
drop policy if exists "questions_delete_all" on public.questions;

create policy "questions_select_all" on public.questions for select using (true);
create policy "questions_insert_all" on public.questions for insert with check (true);
create policy "questions_update_all" on public.questions for update using (true) with check (true);
create policy "questions_delete_all" on public.questions for delete using (true);
