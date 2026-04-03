-- À exécuter une fois dans Supabase → SQL Editor (ne supprime rien, n’écrase pas les données).
-- Ajoute une colonne optionnelle pour le hash du mot de passe (connexion multi-appareils).

alter table public.profiles
  add column if not exists password_hash text;

comment on column public.profiles.password_hash is 'PBKDF2 hash (v1$...) ; null = compte créé avant la récupération ou mot de passe non défini';

-- Si les politiques RLS empêchent la lecture par pseudo pour la connexion, vérifie que la sélection
-- des profils reste possible pour l’app (déjà le cas si la recherche d’amis fonctionne).
