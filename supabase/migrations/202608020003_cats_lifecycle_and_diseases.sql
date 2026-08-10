alter table public.cats
add column if not exists estimated_birth_date date,
add column if not exists is_alive boolean not null default true,
add column if not exists is_adopted boolean not null default false,
add column if not exists deceased_at timestamp with time zone,
add column if not exists adopted_at timestamp with time zone,
add column if not exists current_diseases text[] not null default '{}';

create table if not exists public.cat_disease_history (
  id uuid default gen_random_uuid() primary key,
  cat_id uuid not null references public.cats(id) on delete cascade,
  disease_name text not null,
  diagnosed_at date not null default current_date,
  resolved_at date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.cat_disease_history enable row level security;

drop policy if exists "Users can view cat disease history" on public.cat_disease_history;
drop policy if exists "Users can insert cat disease history" on public.cat_disease_history;
drop policy if exists "Users can update cat disease history" on public.cat_disease_history;

create policy "Users can view cat disease history" on public.cat_disease_history
for select using (auth.role() = 'authenticated');

create policy "Users can insert cat disease history" on public.cat_disease_history
for insert with check (auth.role() = 'authenticated');

create policy "Users can update cat disease history" on public.cat_disease_history
for update using (auth.role() = 'authenticated');
