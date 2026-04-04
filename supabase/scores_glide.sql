-- ═══════════════════════════════════════════════════════════════════════════
-- MyLittlePenguin — table scores + jeu « glide » (Iceberg run)
-- Exécuter dans Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1) VÉRIFICATION : contraintes sur public.scores ───────────────────────
-- Exécute cette requête seule pour voir ce qui existe (nom + définition) :

-- SELECT c.conname AS constraint_name,
--        pg_get_constraintdef(c.oid) AS definition
-- FROM pg_constraint c
-- JOIN pg_class t ON c.conrelid = t.oid
-- JOIN pg_namespace n ON t.relnamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND t.relname = 'scores'
-- ORDER BY c.contype, c.conname;


-- ─── 2) Si la table n’existe pas encore (profils en id texte, comme le reste du projet)

create table if not exists public.scores (
  user_id text not null references public.profiles (id) on delete cascade,
  game text not null,
  score integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, game)
);

create index if not exists scores_user_id_idx on public.scores (user_id);

comment on table public.scores is 'Meilleurs scores mini-jeux par utilisateur (fishing, maze, memory, glide, …)';


-- ─── 3) Élargir ou recréer le CHECK sur « game » pour inclure glide ─────────
-- Si tu avais une erreur du type « violates check constraint » au upsert glide,
-- une contrainte CHECK limitait game à fishing/maze/memory.

-- Noms souvent vus ; enlève ceux qui n’existent pas (no-op si absent).
alter table public.scores drop constraint if exists scores_game_check;
alter table public.scores drop constraint if exists scores_game_key;

-- Si la requête de §1 montre un autre nom (ex. scores_game_enum), décommente et adapte :
-- alter table public.scores drop constraint if exists "nom_exact_ici";


-- Nouvelle liste fermée (4 jeux). Pour ajouter un jeu plus tard, refaire un script
-- similaire ou passer au mode « sans CHECK » (§4).
alter table public.scores
  add constraint scores_game_check
  check (game in ('fishing', 'maze', 'memory', 'glide'));


-- ─── 4) OPTION : pas de liste fermée (toute valeur game acceptée) ──────────
-- Utile si tu préfères ne pas migrer le SQL à chaque nouveau jeu.
-- Exécute UNIQUEMENT si tu veux ce mode (et dans ce cas ne garde pas le bloc §3 ci-dessus
-- qui vient d’ajouter scores_game_check — ou exécute d’abord le DROP ci-dessous).

-- alter table public.scores drop constraint if exists scores_game_check;


-- ─── 5) RLS (optionnel, aligné sur une app en clé anon) ─────────────────────
alter table public.scores enable row level security;

-- Politiques simples : à resserrer si tu relies auth.users aux profils.
drop policy if exists "scores_select_all" on public.scores;
drop policy if exists "scores_insert_all" on public.scores;
drop policy if exists "scores_update_all" on public.scores;
drop policy if exists "scores_upsert_all" on public.scores;

create policy "scores_select_all" on public.scores
  for select to anon, authenticated using (true);

create policy "scores_insert_all" on public.scores
  for insert to anon, authenticated with check (true);

create policy "scores_update_all" on public.scores
  for update to anon, authenticated using (true) with check (true);

-- upsert = insert + update ; on couvre les deux.
