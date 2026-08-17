-- À exécuter une fois dans Supabase → SQL Editor (ne supprime rien, n'écrase pas les données).
-- Ajoute la colonne de visibilité des expéditions par les amis (par défaut : privé).

alter table public.profiles
  add column if not exists expedition_public boolean not null default false;

comment on column public.profiles.expedition_public is 'true = les expéditions sont visibles par les amis ; false (défaut) = privées';
