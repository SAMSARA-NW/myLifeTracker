-- Commitments calendar: a lightweight record of what Nicolas has committed to,
-- with the reminder state needed to mail him before each one.
--
-- Reminder policy (set per row, defaulted from priority by the app):
--   high   -> day before, and again 1 hour before
--   medium -> day before
--   low    -> no email
-- `reminded_day_at` / `reminded_hour_at` record what has already been sent so a
-- repeated sweep can never double-send.

create table if not exists calendar_commitments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  location text,
  category text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'done', 'cancelled')),
  remind_day_before boolean not null default true,
  remind_hour_before boolean not null default false,
  reminded_day_at timestamptz,
  reminded_hour_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dashboard reads upcoming commitments in time order.
create index if not exists calendar_commitments_starts_at_idx
  on calendar_commitments (starts_at);

-- The reminder sweep only ever looks at live rows that still owe a reminder.
create index if not exists calendar_commitments_sweep_idx
  on calendar_commitments (starts_at)
  where status = 'scheduled';

-- Match the convention already used by reading_list / ops_tasks: RLS on, with
-- policies for the anon key the app ships with.
alter table calendar_commitments enable row level security;

drop policy if exists anon_select on calendar_commitments;
create policy anon_select on calendar_commitments
  for select to public using (true);

drop policy if exists anon_insert on calendar_commitments;
create policy anon_insert on calendar_commitments
  for insert to public with check (true);

drop policy if exists anon_update on calendar_commitments;
create policy anon_update on calendar_commitments
  for update to public using (true);

drop policy if exists anon_delete on calendar_commitments;
create policy anon_delete on calendar_commitments
  for delete to public using (true);
