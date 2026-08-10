create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text default 'volunteer' check (role in ('admin', 'caretaker', 'volunteer')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.colonies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  location_name text,
  latitude double precision not null,
  longitude double precision not null,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.cats (
  id uuid default gen_random_uuid() primary key,
  colony_id uuid references public.colonies(id) on delete cascade,
  name text not null,
  gender text check (gender in ('male', 'female', 'unknown')),
  tnr_status text default 'unaltered' check (tnr_status in ('unaltered', 'trapped', 'neutered_spayed', 'eartipped')),
  microchip_id text,
  photo_url text,
  distinctive_marks text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.feeding_logs (
  id uuid default gen_random_uuid() primary key,
  colony_id uuid references public.colonies(id) on delete cascade,
  user_id uuid references public.profiles(id),
  fed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  cats_seen_count integer default 0,
  food_type text,
  notes text
);

alter table public.profiles enable row level security;
alter table public.colonies enable row level security;
alter table public.cats enable row level security;
alter table public.feeding_logs enable row level security;

drop policy if exists "Users can view all colonies" on public.colonies;
drop policy if exists "Users can insert colonies" on public.colonies;
drop policy if exists "Users can update colonies" on public.colonies;
create policy "Users can view all colonies" on public.colonies for select using (auth.role() = 'authenticated');
create policy "Users can insert colonies" on public.colonies for insert with check (auth.role() = 'authenticated');
create policy "Users can update colonies" on public.colonies for update using (auth.role() = 'authenticated');

drop policy if exists "Users can view all cats" on public.cats;
drop policy if exists "Users can insert cats" on public.cats;
drop policy if exists "Users can update cats" on public.cats;
create policy "Users can view all cats" on public.cats for select using (auth.role() = 'authenticated');
create policy "Users can insert cats" on public.cats for insert with check (auth.role() = 'authenticated');
create policy "Users can update cats" on public.cats for update using (auth.role() = 'authenticated');

drop policy if exists "Users can view feeding logs" on public.feeding_logs;
drop policy if exists "Users can insert feeding logs" on public.feeding_logs;
create policy "Users can view feeding logs" on public.feeding_logs for select using (auth.role() = 'authenticated');
create policy "Users can insert feeding logs" on public.feeding_logs for insert with check (auth.role() = 'authenticated');

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('cat-photos', 'cat-photos', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated can upload cat photos" on storage.objects;
drop policy if exists "Authenticated can view cat photos" on storage.objects;
create policy "Authenticated can upload cat photos" on storage.objects
for insert to authenticated
with check (bucket_id = 'cat-photos');
create policy "Authenticated can view cat photos" on storage.objects
for select to authenticated
using (bucket_id = 'cat-photos');
