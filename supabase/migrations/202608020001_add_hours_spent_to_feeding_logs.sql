alter table public.feeding_logs
add column if not exists hours_spent numeric(4,2) not null default 0,
add constraint feeding_logs_hours_spent_check check (hours_spent >= 0 and hours_spent <= 24);
