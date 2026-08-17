-- À exécuter une fois dans Supabase → SQL Editor (ne supprime rien, n'écrase pas les données).
-- Ajoute une colonne optionnelle pour la photo de profil (URL dans le bucket expedition-photos).
-- Si avatar_url est null, on retombe sur l'emoji `avatar`.

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is 'URL publique de la photo de profil ; null = utiliser l''emoji avatar';
