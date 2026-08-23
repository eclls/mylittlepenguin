-- Records de série (max / plus courte).
-- La fonctionnalité « nids » a été abandonnée : on retire la colonne si elle existe.
-- À exécuter une fois dans Supabase → SQL Editor.

alter table public.profiles
  add column if not exists streak_best integer,
  add column if not exists streak_worst integer;

alter table public.profiles drop column if exists nids;

comment on column public.profiles.streak_best is 'Plus longue série (jours sans chasse), y compris la série en cours.';
comment on column public.profiles.streak_worst is 'Plus courte série terminée (entre deux kills / départ). Null si jamais de kill.';
