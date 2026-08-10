drop policy if exists "Users can delete colonies" on public.colonies;
create policy "Users can delete colonies" on public.colonies
for delete using (auth.role() = 'authenticated');
