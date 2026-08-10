create table if not exists public.cat_diseases (
  id uuid default gen_random_uuid() primary key,
  cat_id uuid not null references public.cats(id) on delete cascade,
  disease_name text not null,
  diagnosed_at date not null default current_date,
  resolved_at date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.cat_disease_treatments (
  id uuid default gen_random_uuid() primary key,
  cat_disease_id uuid not null references public.cat_diseases(id) on delete cascade,
  treatment_name text not null,
  started_at date not null default current_date,
  ended_at date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_cat_diseases_cat_id on public.cat_diseases(cat_id);
create index if not exists idx_cat_diseases_diagnosed_at on public.cat_diseases(diagnosed_at desc);
create index if not exists idx_cat_disease_treatments_disease_id on public.cat_disease_treatments(cat_disease_id);
create index if not exists idx_cat_disease_treatments_started_at on public.cat_disease_treatments(started_at desc);

alter table public.cat_diseases enable row level security;
alter table public.cat_disease_treatments enable row level security;

drop policy if exists "Users can view cat diseases" on public.cat_diseases;
drop policy if exists "Users can insert cat diseases" on public.cat_diseases;
drop policy if exists "Users can update cat diseases" on public.cat_diseases;
drop policy if exists "Users can delete cat diseases" on public.cat_diseases;

create policy "Users can view cat diseases" on public.cat_diseases
for select using (auth.role() = 'authenticated');

create policy "Users can insert cat diseases" on public.cat_diseases
for insert with check (auth.role() = 'authenticated');

create policy "Users can update cat diseases" on public.cat_diseases
for update using (auth.role() = 'authenticated');

create policy "Users can delete cat diseases" on public.cat_diseases
for delete using (auth.role() = 'authenticated');

drop policy if exists "Users can view cat disease treatments" on public.cat_disease_treatments;
drop policy if exists "Users can insert cat disease treatments" on public.cat_disease_treatments;
drop policy if exists "Users can update cat disease treatments" on public.cat_disease_treatments;
drop policy if exists "Users can delete cat disease treatments" on public.cat_disease_treatments;

create policy "Users can view cat disease treatments" on public.cat_disease_treatments
for select using (auth.role() = 'authenticated');

create policy "Users can insert cat disease treatments" on public.cat_disease_treatments
for insert with check (auth.role() = 'authenticated');

create policy "Users can update cat disease treatments" on public.cat_disease_treatments
for update using (auth.role() = 'authenticated');

create policy "Users can delete cat disease treatments" on public.cat_disease_treatments
for delete using (auth.role() = 'authenticated');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cats'
      and column_name = 'current_diseases'
  ) then
    insert into public.cat_diseases (cat_id, disease_name, diagnosed_at)
    select c.id, trim(disease_name), current_date
    from public.cats as c,
      lateral unnest(coalesce(c.current_diseases, '{}'::text[])) as disease_name
    where trim(disease_name) <> '';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'cat_disease_history'
  ) then
    insert into public.cat_diseases (cat_id, disease_name, diagnosed_at, resolved_at, notes, created_at, updated_at)
    select
      cat_id,
      disease_name,
      diagnosed_at,
      resolved_at,
      notes,
      created_at,
      timezone('utc'::text, now())
    from public.cat_disease_history;
  end if;
end $$;

drop table if exists public.cat_disease_history;
alter table public.cats drop column if exists current_diseases;
