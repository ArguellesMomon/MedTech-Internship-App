# MedTech Intern Companion Architecture

MedTech Intern Companion is a frontend-only React and Supabase app for medical technology students in the Philippines who are starting clinical internship. The app should feel warm, cute, and student-friendly, but the first implementation priority is a clean data model and feature structure.

## Product Scope

### Main Pages

- `Login`: email/password login through Supabase Auth.
- `Sign up`: creates a Supabase Auth user and initial profile.
- `Profile`: editable name, school, year level, program, and future preferences.
- `Dashboard`: current rotation, upcoming shifts, exam dates, quota overview, fatigue reminder, and encouragement.
- `Rotations`: section tabs for Hematology, Clinical Chemistry, Microbiology, Blood Bank, Histopathology/Cytology, and other internship areas.
- `Quota Tracker`: per-section tasks, targets, completed counts, checklist items, and progress bars.
- `Shift Planner`: calendar or weekly view for duty days, rest days, night shifts, and notes.
- `Notes`: personal notes and staff tips filtered by section.
- `Encouragement`: random supportive messages and optional mood-sticker-style check-ins.

### Profile Fields

- `full_name`
- `email`
- `school`
- `year_level`
- `program`
- `avatar_url`
- `internship_start_date`
- `preferred_reminder_time`

## React Folder Structure

```txt
src/
  auth/
    AuthProvider.jsx
  components/
    dashboard/
      CurrentRotation.jsx
      ProgressSection.jsx
      ShiftList.jsx
      FatigueHelper.jsx
    quotas/
      QuotaTracker.jsx
      QuotaSection.jsx
      QuotaChecklist.jsx
    rotations/
      RotationTabs.jsx
      ProcedureList.jsx
      SafetyReminders.jsx
    shifts/
      ShiftCalendar.jsx
      ShiftForm.jsx
      ShiftList.jsx
    notes/
      NoteList.jsx
      NoteForm.jsx
      NoteEdit.jsx
    encouragement/
      EncouragementCard.jsx
      MoodCheckIn.jsx
  lib/
    supabase.js
  pages/
    Dashboard.jsx
    Login.jsx
    Profile.jsx
    Signup.jsx
    Rotations.jsx
    Quotas.jsx
    Shifts.jsx
    Notes.jsx
```

The starter keeps several dashboard subcomponents inside `Dashboard.jsx` for readability. As the app grows, move them into `src/components/dashboard/`.

## Component Trees

### Auth and Profile

```txt
App
  AuthProvider
    AppLayout
      Login
      Signup
      ProtectedRoute
        Profile
```

Auth logic lives in `src/auth/AuthProvider.jsx`.

- `supabase.auth.getSession()` hydrates the initial session.
- `supabase.auth.onAuthStateChange()` keeps session state synced.
- `supabase.auth.signUp()` creates accounts.
- `supabase.auth.signInWithPassword()` logs users in.
- `profiles.upsert()` saves editable profile fields.

### Dashboard

```txt
Dashboard
  CurrentRotation
  ShiftList
  ProgressSection
  FatigueHelper
  EncouragementCard
```

Fetches:

- `rotations` filtered by `user_id`, ordered by `start_date`.
- `shifts` filtered by `user_id` and upcoming `shift_date`.
- `quotas` filtered by `user_id`.
- Later: `exam_dates`, `mood_logs`, and approved `encouragement_messages`.

### Rotation and Procedure Guide

```txt
RotationsPage
  RotationTabs
  ProcedureList
    ProcedureCard
    SafetyReminders
```

Early version can hard-code general procedure guide content in local files, especially if it is static school-friendly guidance. Store it in Supabase when the user needs custom procedures, staff tips, school-specific checklists, or admin-managed content.

### Quota and Task Tracker

```txt
QuotasPage
  QuotaTracker
    QuotaSection
      ProgressBar
      QuotaChecklist
        QuotaTaskCheckbox
```

Each quota row belongs to one `user_id`. Updates should always include both `id` and `user_id` in the query to avoid accidental cross-user writes.

### Shift Planner and Fatigue Helper

```txt
ShiftsPage
  ShiftCalendar
  ShiftList
  ShiftForm
  FatigueHelper
```

Store shift date, start/end time, section, shift type, and notes in Supabase. The fatigue helper can derive reminders from night shifts, consecutive shifts, or too few rest days.

### Notes and Staff Tips

```txt
NotesPage
  SectionFilter
  NoteSearch
  NoteList
    NoteCard
      NoteEdit
  NoteForm
```

Personal notes are user-owned. Staff tips can either be user-owned notes marked with `is_staff_tip` or shared approved content in a separate table.

### Encouragement

```txt
EncouragementCard
MoodCheckIn
```

Start with local approved strings. Later, store approved messages in Supabase so they can be tagged by section, mood, or shift type.

## Supabase Schema

Run this in the Supabase SQL editor after creating a project.

```sql
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

create table public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mood_tag text not null,
  note text,
  logged_at timestamptz default now()
);
```

## Row Level Security

Enable RLS and add user-owned policies.

```sql
alter table public.profiles enable row level security;
alter table public.rotations enable row level security;
alter table public.quotas enable row level security;
alter table public.quota_tasks enable row level security;
alter table public.shifts enable row level security;
alter table public.notes enable row level security;
alter table public.mood_logs enable row level security;

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

create policy "Users can manage own rotations"
on public.rotations for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own quotas"
on public.quotas for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own quota tasks"
on public.quota_tasks for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own shifts"
on public.shifts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own notes"
on public.notes for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own mood logs"
on public.mood_logs for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.encouragement_messages enable row level security;

create policy "Anyone authenticated can read active encouragements"
on public.encouragement_messages for select
to authenticated
using (is_active = true);
```

## High-Level Layout

- Top bar: app name, profile link, logout.
- Sidebar on desktop: Dashboard, Rotations, Quotas, Shifts, Notes.
- Main content area: page heading, primary page modules, and forms.
- Mobile: sidebar becomes a horizontal navigation area or bottom navigation.

Keep visual design simple for now. Later styling can make the app soft, pastel, and student-friendly without changing the data flow.
