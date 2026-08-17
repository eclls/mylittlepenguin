-- Abonnements Web Push (MyLittlePenguin)
-- Permet d'envoyer des notifications même quand l'app est fermée.
-- Exécuter une fois dans Supabase → SQL Editor (après la table profiles).
--
-- Chaque appareil/navigateur d'un utilisateur crée un abonnement (endpoint unique).
-- La clé privée VAPID ne vit QUE côté serveur (Edge Function), jamais ici.

create table if not exists public.push_subscriptions (
  -- endpoint = identifiant unique de l'abonnement fourni par le service de push
  endpoint   text primary key,
  -- profiles.id est du texte dans ce projet (ex. mlp_…), pas uuid
  user_id    text not null references public.profiles (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- L'app utilise la clé anon + des id profil texte (≠ auth.uid()). Politiques ouvertes
-- pour anon/authenticated, comme le reste du client MyLittlePenguin.
-- L'Edge Function, elle, utilise la service_role qui contourne la RLS.
create policy "push_subscriptions_select_all" on public.push_subscriptions
  for select to anon, authenticated using (true);

create policy "push_subscriptions_insert_all" on public.push_subscriptions
  for insert to anon, authenticated with check (true);

create policy "push_subscriptions_update_all" on public.push_subscriptions
  for update to anon, authenticated using (true) with check (true);

create policy "push_subscriptions_delete_all" on public.push_subscriptions
  for delete to anon, authenticated using (true);

comment on table public.push_subscriptions is 'Abonnements Web Push par appareil (notifs app fermée).';
