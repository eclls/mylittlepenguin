-- ═══════════════════════════════════════════════════════════════════════════
-- MyLittlePenguin — RESTAURER la frise + la carte (table public.expeditions)
--
-- Contexte : tes expéditions sont toujours dans la base (la table contient des
-- lignes), mais l'app ne les affiche plus. La cause la plus fréquente est que
-- la sécurité RLS a été activée sur « expeditions » SANS politique de lecture
-- pour la clé « anon » (celle utilisée par l'app). Résultat : la requête de
-- lecture renvoie 0 ligne, alors que les données existent.
--
-- Exécute les sections dans l'ordre, dans Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── A) DIAGNOSTIC : la RLS est-elle activée, et quelles politiques ? ───────
-- (Lecture seule — n'écrit rien.)

select relname as table_name, relrowsecurity as rls_active
from pg_class
where relname = 'expeditions';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'expeditions'
order by cmd, policyname;


-- ─── B) DIAGNOSTIC : sous quel user_id sont rangées tes expéditions ? ───────
-- Compte les expéditions par compte. Remplace TONPSEUDO par ton pseudo exact.

select user_id, count(*) as nb, min(exp_date) as premiere, max(exp_date) as derniere
from public.expeditions
group by user_id
order by nb desc;

select id, pseudo, start_date
from public.profiles
where pseudo = 'TONPSEUDO';
-- Si tu vois PLUSIEURS lignes ici avec le même pseudo, va voir la section D.


-- ─── C) RESTAURER L'ACCÈS EN LECTURE/ÉCRITURE (cas le plus probable) ────────
-- Politiques permissives, alignées sur le reste du projet (app en clé anon).
-- Ne supprime aucune donnée.

alter table public.expeditions enable row level security;

drop policy if exists "expeditions_select_all" on public.expeditions;
drop policy if exists "expeditions_insert_all" on public.expeditions;
drop policy if exists "expeditions_update_all" on public.expeditions;
drop policy if exists "expeditions_delete_all" on public.expeditions;

create policy "expeditions_select_all" on public.expeditions
  for select to anon, authenticated using (true);

create policy "expeditions_insert_all" on public.expeditions
  for insert to anon, authenticated with check (true);

create policy "expeditions_update_all" on public.expeditions
  for update to anon, authenticated using (true) with check (true);

create policy "expeditions_delete_all" on public.expeditions
  for delete to anon, authenticated using (true);

-- → Recharge l'app : la frise et les pins devraient revenir.
--   (Si tu préfères carrément désactiver la RLS, à la place des CREATE POLICY :
--    alter table public.expeditions disable row level security; )


-- ─── D) (OPTIONNEL) Si la section B montre DEUX profils au même pseudo ──────
-- Cela veut dire que l'app a recréé un compte (nouvel user_id) et regarde au
-- mauvais endroit. Ici on rattache toutes les expéditions au compte que l'app
-- utilise aujourd'hui.
--
-- 1) ANCIEN_ID = le user_id qui possède tes expéditions (le « nb » élevé en B).
-- 2) NOUVEAU_ID = l'id du profil que l'app utilise maintenant (souvent le plus
--    récent en B, celui sans expédition).
-- Remplace les deux valeurs puis exécute :

-- update public.expeditions
--   set user_id = 'NOUVEAU_ID'
--   where user_id = 'ANCIEN_ID';

-- (Idem si tu veux déplacer les photos / autres tables liées au même user_id.)
