-- ─────────────────────────────────────────────
-- DROP EXISTING TABLES (clean slate)
-- ─────────────────────────────────────────────

drop table if exists public.procedures cascade;
drop table if exists public.encouragement_messages cascade;
drop table if exists public.exams cascade;
drop table if exists public.notes cascade;
drop table if exists public.shifts cascade;
drop table if exists public.quota_tasks cascade;
drop table if exists public.daily_reports cascade;
drop table if exists public.quotas cascade;
drop table if exists public.rotations cascade;
drop table if exists public.profiles cascade;

-- ─────────────────────────────────────────────
-- CREATE TABLES
-- ─────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  school text,
  year_level text,
  program text,
  avatar_url text,
  internship_start_date date,
  preferred_reminder_time time,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.rotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_name text not null,
  hospital_site text,
  start_date date not null,
  end_date date not null,
  supervisor_name text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.quotas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_name text not null,
  task_name text not null,
  target_count integer not null default 0,
  completed_count integer not null default 0,
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_name text not null,
  log_date date not null default current_date,
  procedure_name text,
  count_done integer not null default 1,
  competency text check (competency in ('pass', 'needs_work', 'fail', 'observed')) default 'pass',
  supervisor text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.quota_tasks (
  id uuid primary key default gen_random_uuid(),
  quota_id uuid not null references public.quotas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  is_done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_name text not null,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  shift_type text check (shift_type in ('morning', 'afternoon', 'night', 'rest', 'exam', 'other')) default 'morning',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_name text,
  title text not null,
  body text not null,
  is_staff_tip boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.encouragement_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  section_name text,
  mood_tag text,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_name text not null,
  exam_date date not null,
  section_name text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  section_name text not null,
  procedure_name text not null,
  description text,
  safety_notes text,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.rotations enable row level security;
alter table public.quotas enable row level security;
alter table public.daily_reports enable row level security;
alter table public.quota_tasks enable row level security;
alter table public.shifts enable row level security;
alter table public.notes enable row level security;
alter table public.encouragement_messages enable row level security;
alter table public.exams enable row level security;
alter table public.procedures enable row level security;

-- profiles
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- rotations
create policy "Users can manage own rotations"
on public.rotations for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- quotas
create policy "Users can manage own quotas"
on public.quotas for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- quota_tasks
create policy "Users can manage own quota tasks"
on public.quota_tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- daily_reports
create policy "Users can manage own daily reports"
on public.daily_reports for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- shifts
create policy "Users can manage own shifts"
on public.shifts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- notes
create policy "Users can manage own notes"
on public.notes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- exams
create policy "Users can manage own exams"
on public.exams for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- procedures
create policy "Authenticated users can manage procedures"
on public.procedures for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

-- encouragement_messages
create policy "Anyone authenticated can read active encouragements"
on public.encouragement_messages for select
to authenticated
using (is_active = true);

-- ─────────────────────────────────────────────
-- SAMPLE DATA
-- ─────────────────────────────────────────────

insert into public.encouragement_messages (message, section_name) values
  ('You''re doing great! Keep up the good work.', null),
  ('Remember to take breaks and stay hydrated.', null),
  ('Every expert was once a beginner. You''ve got this!', null),
  ('One step at a time. Progress is progress.', null);

-- ─────────────────────────────────────────────
-- STORAGE — AVATARS BUCKET
-- ─────────────────────────────────────────────

-- Create the bucket (public so avatar URLs work without auth tokens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB max per file
  array['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update
  set public            = true,
      file_size_limit   = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Drop old policies so re-running the script is safe
drop policy if exists "Avatars are publicly accessible" on storage.objects;
drop policy if exists "Users can upload own avatar"     on storage.objects;
drop policy if exists "Users can update own avatar"     on storage.objects;
drop policy if exists "Users can delete own avatar"     on storage.objects;

-- Anyone (including anonymous visitors) can view avatars
create policy "Avatars are publicly accessible"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- Authenticated users can upload into their own folder (avatars/<user_id>/...)
create policy "Users can upload own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can overwrite their own avatar (upsert)
create policy "Users can update own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Authenticated users can delete their own avatar
create policy "Users can delete own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);