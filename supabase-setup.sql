-- Run this ONCE in Supabase -> SQL Editor for the project used by app.js.
-- It creates one private JSON document per authenticated user.

create table if not exists public.personal_hub_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.personal_hub_data enable row level security;

drop policy if exists "Users can read own hub data" on public.personal_hub_data;
create policy "Users can read own hub data"
on public.personal_hub_data for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own hub data" on public.personal_hub_data;
create policy "Users can insert own hub data"
on public.personal_hub_data for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own hub data" on public.personal_hub_data;
create policy "Users can update own hub data"
on public.personal_hub_data for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant select, insert, update on table public.personal_hub_data to authenticated;
