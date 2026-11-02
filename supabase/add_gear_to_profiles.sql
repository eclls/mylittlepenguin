-- Accessoires du pingouin de banquise (3 maximum, un par zone).
-- À exécuter une fois dans Supabase → SQL Editor.
-- Sans cette colonne, le costume reste sur le téléphone mais les amis ne le voient pas.

alter table public.profiles
  add column if not exists gear jsonb not null default '[]'::jsonb;

comment on column public.profiles.gear is 'Ids d accessoires du pingouin (mulet, chapeau, tutu…), 3 max.';
