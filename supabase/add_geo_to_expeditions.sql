-- À exécuter une fois dans Supabase → SQL Editor.
-- Lieux des expéditions (carte) : persistance après déconnexion / multi-appareils.

alter table public.expeditions
  add column if not exists geo_lat double precision,
  add column if not exists geo_lng double precision,
  add column if not exists geo_label text;

comment on column public.expeditions.geo_lat is 'Latitude WGS84 (optionnel)';
comment on column public.expeditions.geo_lng is 'Longitude WGS84 (optionnel)';
comment on column public.expeditions.geo_label is 'Libellé du lieu (géocodage)';
