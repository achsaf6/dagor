-- Create monsters table for reusable token templates
create table if not exists public.monsters (
  id uuid primary key default gen_random_uuid(),
  color text not null unique,
  size text not null default 'medium',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to keep updated_at fresh
create or replace function public.set_current_timestamp_on_monsters()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_current_timestamp_on_monsters
  on public.monsters;

create trigger set_current_timestamp_on_monsters
before update on public.monsters
for each row
execute procedure public.set_current_timestamp_on_monsters();

-- Enable RLS so client-side Supabase key can read/write
alter table public.monsters enable row level security;

drop policy if exists "monsters select" on public.monsters;
create policy "monsters select"
  on public.monsters for select using (true);

drop policy if exists "monsters insert" on public.monsters;
create policy "monsters insert"
  on public.monsters for insert
  with check (true);

drop policy if exists "monsters update" on public.monsters;
create policy "monsters update"
  on public.monsters for update
  using (true);

