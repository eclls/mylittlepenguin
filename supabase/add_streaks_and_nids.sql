-- Records de série (max / plus courte) + nids (relations habituelles).
-- À exécuter une fois dans Supabase → SQL Editor.

alter table public.profiles
  add column if not exists streak_best integer,
  add column if not exists streak_worst integer,
  add column if not exists nids jsonb not null default '[]'::jsonb;

comment on column public.profiles.streak_best is 'Plus longue série (jours sans chasse), y compris la série en cours.';
comment on column public.profiles.streak_worst is 'Plus courte série terminée (entre deux kills / départ). Null si jamais de kill.';
comment on column public.profiles.nids is 'Relations habituelles [{id,name,since,until}], compteur auto sans expédition.';
