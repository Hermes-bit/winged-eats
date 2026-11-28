-- À exécuter dans le SQL Editor du projet Supabase Winged Eats.
-- Les clients ne peuvent pas accéder à cette table ; seul le serveur avec service_role le peut.
create table if not exists public.winged_restaurant_moderation (
  place_id text primary key check (place_id ~ '^[A-Za-z0-9_-]{8,300}$'),
  hidden boolean not null default false,
  photos_hidden boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.winged_restaurant_moderation enable row level security;
revoke all on public.winged_restaurant_moderation from public, anon, authenticated;
grant select, insert, update on public.winged_restaurant_moderation to service_role;
