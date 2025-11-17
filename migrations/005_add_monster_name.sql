alter table if exists public.monsters
  add column if not exists name text not null default '';

update public.monsters
set name = case
  when coalesce(trim(name), '') = '' then color
  else name
end;

