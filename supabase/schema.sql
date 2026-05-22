-- ═══════════════════════════════════════════════════════════════
-- MEDTECH MATE — DATABASE SCHEMA (with chat_messages for AI Chatbot)
-- Run this entire file in your Supabase SQL Editor.
-- It is safe to re-run: all DROP statements are idempotent.
-- ═══════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────
-- 1. DROP EXISTING TABLES  (clean slate)
-- ─────────────────────────────────────────────

drop table if exists public.chat_messages         cascade;
drop table if exists public.documents              cascade;
drop table if exists public.mood_logs              cascade;
drop table if exists public.procedures             cascade;
drop table if exists public.encouragement_messages cascade;
drop table if exists public.exams                  cascade;
drop table if exists public.notes                  cascade;
drop table if exists public.shifts                 cascade;
drop table if exists public.quota_tasks            cascade;
drop table if exists public.daily_reports          cascade;
drop table if exists public.quotas                 cascade;
drop table if exists public.rotations              cascade;
drop table if exists public.user_settings          cascade;
drop table if exists public.profiles               cascade;


-- ─────────────────────────────────────────────
-- 2. CREATE TABLES
-- ─────────────────────────────────────────────

-- ── Profiles ──────────────────────────────────
create table public.profiles (
  id                      uuid        primary key references auth.users(id) on delete cascade,
  email                   text,
  full_name               text,
  school                  text,
  year_level              text,
  program                 text        default 'BS Medical Technology',
  avatar_url              text,
  internship_start_date   date,
  preferred_reminder_time time,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- User Settings (replaces browser localStorage)
create table public.user_settings (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  value      jsonb       not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint user_settings_user_key_unique unique (user_id, key)
);

-- ── Rotations ─────────────────────────────────
create table public.rotations (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  section_name    text        not null,
  hospital_site   text,
  start_date      date        not null,
  end_date        date        not null,
  supervisor_name text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),

  constraint rotations_dates_check check (end_date >= start_date)
);

-- ── Quotas (procedure targets per section) ────
create table public.quotas (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  section_name    text        not null,
  task_name       text        not null,
  target_count    integer     not null default 0 check (target_count >= 0),
  completed_count integer     not null default 0 check (completed_count >= 0),
  due_date        date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Daily Reports / Logbook ───────────────────
create table public.daily_reports (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  section_name   text        not null,
  log_date       date        not null    default current_date,
  procedure_name text,
  count_done     integer     not null    default 1 check (count_done >= 1),
  competency     text        check (competency in ('pass', 'needs_work', 'fail', 'observed'))
                             default 'pass',
  supervisor     text,
  notes          text,
  progress       integer     default 100 check (progress between 0 and 100),
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ── Quota Tasks (sub-tasks inside a quota) ────
create table public.quota_tasks (
  id           uuid        primary key default gen_random_uuid(),
  quota_id     uuid        not null references public.quotas(id) on delete cascade,
  user_id      uuid        not null references auth.users(id)  on delete cascade,
  label        text        not null,
  is_done      boolean     not null default false,
  completed_at timestamptz,
  created_at   timestamptz default now()
);

-- ── Shifts ────────────────────────────────────
create table public.shifts (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  section_name text        not null,
  shift_date   date        not null,
  start_time   time        not null,
  end_time     time        not null,
  shift_type   text        check (shift_type in ('morning','afternoon','night','rest','exam','other'))
                           default 'morning',
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Exams ─────────────────────────────────────
create table public.exams (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  exam_name    text        not null,
  exam_date    date        not null,
  section_name text,
  notes        text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Notes & Staff Tips ────────────────────────
create table public.notes (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  section_name text,
  title        text        not null,
  body         text        not null,
  is_staff_tip boolean     not null default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Encouragement Messages ────────────────────
create table public.encouragement_messages (
  id           uuid        primary key default gen_random_uuid(),
  message      text        not null,
  section_name text,
  mood_tag     text,
  is_active    boolean     not null default true,
  created_at   timestamptz default now()
);

-- ── Mood Logs ─────────────────────────────────
create table public.mood_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  mood_tag   text        not null,
  logged_at  timestamptz default now()
);

-- ── Documents (file library) ──────────────────
create table public.documents (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  file_name    text        not null,
  file_url     text        not null,
  storage_path text        not null,
  file_type    text        not null check (file_type in ('pdf','docx','pptx','other')),
  file_size    bigint,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Procedures (Rotation Guide library) ───────
create table public.procedures (
  id             uuid        primary key default gen_random_uuid(),
  section_name   text        not null,
  procedure_name text        not null,
  description    text,
  safety_notes   text,
  created_at     timestamptz default now()
);

-- ⭐ NEW: Chat Messages (persistent conversation history for AI Chatbot)
create table public.chat_messages (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  conversation_id text        not null,   -- unique per chat session (e.g., "conv_abc123")
  role            text        not null check (role in ('user', 'assistant')),
  content         text        not null,
  created_at      timestamptz default now()
);


-- ─────────────────────────────────────────────
-- 3. INDEXES  (improve query performance)
-- ─────────────────────────────────────────────

create index if not exists idx_rotations_user_dates
  on public.rotations (user_id, start_date, end_date);

create index if not exists idx_quotas_user_section
  on public.quotas (user_id, section_name);

create index if not exists idx_daily_reports_user_date
  on public.daily_reports (user_id, log_date desc);

create index if not exists idx_daily_reports_user_section
  on public.daily_reports (user_id, section_name);

create index if not exists idx_quota_tasks_quota
  on public.quota_tasks (quota_id);

create index if not exists idx_shifts_user_date
  on public.shifts (user_id, shift_date);

create index if not exists idx_exams_user_date
  on public.exams (user_id, exam_date);

create index if not exists idx_notes_user_section
  on public.notes (user_id, section_name);

create index if not exists idx_mood_logs_user
  on public.mood_logs (user_id, logged_at desc);

create index if not exists idx_procedures_section
  on public.procedures (section_name);

create index if not exists idx_documents_user
  on public.documents (user_id, created_at desc);

create index if not exists idx_user_settings_user_key
  on public.user_settings (user_id, key);

-- ⭐ New indexes for chat_messages
create index if not exists idx_chat_messages_user_conversation
  on public.chat_messages (user_id, conversation_id, created_at);

create index if not exists idx_chat_messages_user_created
  on public.chat_messages (user_id, created_at);


-- ─────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table public.profiles             enable row level security;
alter table public.rotations            enable row level security;
alter table public.quotas               enable row level security;
alter table public.daily_reports        enable row level security;
alter table public.quota_tasks          enable row level security;
alter table public.shifts               enable row level security;
alter table public.exams                enable row level security;
alter table public.notes                enable row level security;
alter table public.encouragement_messages enable row level security;
alter table public.mood_logs            enable row level security;
alter table public.procedures           enable row level security;
alter table public.documents            enable row level security;
alter table public.user_settings        enable row level security;
alter table public.chat_messages        enable row level security;  -- ⭐


-- ── Profiles ──────────────────────────────────
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── Rotations ─────────────────────────────────
create policy "rotations_all_own"
  on public.rotations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Quotas ────────────────────────────────────
create policy "quotas_all_own"
  on public.quotas for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Quota Tasks ───────────────────────────────
create policy "quota_tasks_all_own"
  on public.quota_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Daily Reports ─────────────────────────────
create policy "daily_reports_all_own"
  on public.daily_reports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Shifts ────────────────────────────────────
create policy "shifts_all_own"
  on public.shifts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Exams ─────────────────────────────────────
create policy "exams_all_own"
  on public.exams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Notes ─────────────────────────────────────
create policy "notes_all_own"
  on public.notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- User Settings
create policy "user_settings_all_own"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Encouragement Messages ────────────────────
create policy "encouragement_select_active"
  on public.encouragement_messages for select
  to authenticated
  using (is_active = true);

-- ── Mood Logs ─────────────────────────────────
create policy "mood_logs_all_own"
  on public.mood_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Procedures ────────────────────────────────
create policy "procedures_select_authenticated"
  on public.procedures for select
  to authenticated
  using (true);

create policy "procedures_insert_authenticated"
  on public.procedures for insert
  to authenticated
  with check (true);

create policy "procedures_update_authenticated"
  on public.procedures for update
  to authenticated
  using (true)
  with check (true);

create policy "procedures_delete_authenticated"
  on public.procedures for delete
  to authenticated
  using (true);

-- ── Documents ─────────────────────────────────
create policy "documents_all_own"
  on public.documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ⭐ Chat Messages RLS policies
create policy "chat_messages_select_own"
  on public.chat_messages for select
  using (auth.uid() = user_id);

create policy "chat_messages_insert_own"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

create policy "chat_messages_delete_own"
  on public.chat_messages for delete
  using (auth.uid() = user_id);

create policy "chat_messages_update_own"
  on public.chat_messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ─────────────────────────────────────────────
-- 5. SEED DATA
-- ─────────────────────────────────────────────

-- ── Encouragement messages ────────────────────
insert into public.encouragement_messages (message, section_name, mood_tag) values
  ('You''re doing great! Every procedure you complete brings you closer to becoming an excellent MLT. Keep going! 💪', null, null),
  ('Remember to take breaks and stay hydrated. A healthy intern is an effective intern! 💧', null, 'Tired'),
  ('Every expert was once a beginner. The fact that you showed up today means you''re already succeeding. 🌟', null, null),
  ('One step at a time. Progress is progress, no matter how small. You''ve got this! ✨', null, null),
  ('Feeling overwhelmed? That means you''re growing. Take a deep breath and tackle one task at a time. 🧘', null, 'Overwhelmed'),
  ('Your hard work in the lab today is building the clinical foundation of your entire career. It matters! 🔬', null, null),
  ('Mistakes are your best teacher. Every error you catch and learn from makes you a safer, better MLT. 📚', null, 'Stressed'),
  ('You are training to save lives. What you do in that laboratory truly matters to every patient. ❤️', null, null),
  ('Being motivated is great, but even on tired days — showing up is what builds mastery. You''re here. That counts. 🏆', null, 'Motivated'),
  ('Happy to be here? That energy is contagious! Bring it to your section today and make it a great shift. 😊', null, 'Happy'),
  ('Clinical Chemistry may be complex, but so are you. You can figure this out! 🧪', 'Clinical Chemistry', null),
  ('Every blood smear you read is a story. Learn to read them well and you''ll help patients for a lifetime. 🩸', 'Hematology', null),
  ('Microbiology is the art of finding the invisible. Keep your technique sharp — the bugs can''t hide from you! 🦠', 'Microbiology', null),
  ('In the Blood Bank, precision saves lives. Your attention to detail today protects a patient tomorrow. 🏥', 'Blood Bank', null),
  ('Histopathology: where science becomes art. Your eyes are learning to see what others can''t. 🔭', 'Histopathology/Cytology', null);

-- ── Default procedures library ────────────────
-- (your full list remains intact – included below)
insert into public.procedures (section_name, procedure_name, description, safety_notes) values

  -- Hematology
  ('Hematology', 'CBC (Complete Blood Count)',
   'Measures red blood cells, white blood cells, hemoglobin, hematocrit, MCV, MCH, MCHC, and platelets using an automated hematology analyzer. Evaluate both analyzer flags and manual differentials.',
   'Handle all blood specimens as potentially infectious. Use gloves, lab coat, and face shield when operating the analyzer or processing samples.'),

  ('Hematology', 'Peripheral Blood Smear',
   'Prepare a thin smear from EDTA blood, air-dry, and stain with Wright-Giemsa. Systematically scan at 10× then perform a 100-cell WBC differential at 100× oil immersion. Identify and report morphological abnormalities.',
   'Fix smears promptly to prevent artifact. Oil immersion lens requires careful handling; clean immediately after use to prevent lens damage.'),

  ('Hematology', 'Erythrocyte Sedimentation Rate (ESR)',
   'Measure the rate at which red blood cells settle in one hour using the Westergren method. Record height of RBC column from meniscus. Normal: male < 15 mm/hr, female < 20 mm/hr.',
   'Ensure tubes are vertical and free from vibration. Use citrated blood within 4 hours of collection.'),

  ('Hematology', 'Platelet Count (Manual)',
   'Perform direct platelet count using Rees-Ecker or Unopette method with phase-contrast microscopy. Count platelets in 10 squares of the hemocytometer and calculate per µL.',
   'Mix blood gently to resuspend platelets before dilution. Platelets clump easily; report any aggregates observed.'),

  ('Hematology', 'Prothrombin Time (PT) / APTT',
   'PT evaluates the extrinsic pathway (Factors I, II, V, VII, X). APTT evaluates the intrinsic pathway. Mix citrated plasma with thromboplastin reagent (PT) or contact activator + phospholipid (APTT) and measure clot formation time.',
   'Use citrated blood collected in 9:1 ratio. Avoid lipemic or hemolyzed specimens. Analyze within 4 hours or per kit instructions.'),

  ('Hematology', 'Reticulocyte Count',
   'Stain whole blood with brilliant cresyl blue or new methylene blue to visualize residual RNA. Count percentage of reticulocytes per 1000 RBCs. Correct for anemia using reticulocyte production index (RPI) if needed.',
   'Incubate stain-blood mixture at correct temperature. Use fresh reagent; degraded stain produces unreliable results.'),

  ('Hematology', 'Hemoglobin Determination (Cyanmethemoglobin)',
   'Convert hemoglobin to stable cyanmethemoglobin using Drabkin''s reagent. Read absorbance at 540 nm and compare against calibration curve. Automated analyzers use lysed blood photometry.',
   'Drabkin''s reagent contains potassium cyanide — treat as toxic waste. Dispose in designated chemical waste container.'),

  -- Clinical Chemistry
  ('Clinical Chemistry', 'Blood Glucose (Fasting & Random)',
   'Measure plasma glucose using the glucose oxidase or hexokinase enzymatic method on an automated analyzer. Fasting reference: 70–99 mg/dL. Glucose tolerance test involves baseline then 75g oral glucose load with 1- and 2-hour sampling.',
   'Use fluoride-oxalate tubes for glucose to inhibit glycolysis. Analyze within 30 min of collection or refrigerate. Protect from light.'),

  ('Clinical Chemistry', 'Lipid Profile',
   'Measure total cholesterol, triglycerides, HDL-cholesterol enzymatically. Calculate LDL using Friedewald equation: LDL = TC − HDL − (TG ÷ 5). Requires 9–12 hour fasting specimen.',
   'Lipemic specimens may interfere with many assays. Notify clinician if TG > 400 mg/dL; Friedewald equation is inaccurate at high TG. Use lipid-clearing reagents per analyzer protocol.'),

  ('Clinical Chemistry', 'Liver Function Tests (LFTs)',
   'Panel includes ALT, AST, ALP, GGT, total/direct bilirubin, total protein, and albumin. Enzymes measured by kinetic UV or colorimetric methods. Bilirubin uses diazo reaction (Jendrassik-Grof method).',
   'Protect bilirubin specimens from light — photodegradation is rapid. Hemolysis falsely elevates AST and LDH. Process specimens promptly.'),

  ('Clinical Chemistry', 'Kidney Function Tests (BUN / Creatinine)',
   'BUN measured by urease-GLDH method. Creatinine by Jaffe kinetic method or enzymatic method on automated platform. Calculate eGFR using CKD-EPI or MDRD equation. Report with reference ranges and flag critical values.',
   'Avoid prolonged tourniquet use — can falsely elevate creatinine. Highly hemolyzed or lipemic specimens should be noted. Report critical creatinine (> 10 mg/dL) immediately.'),

  ('Clinical Chemistry', 'Electrolytes (Na, K, Cl, CO₂)',
   'Measured by ion-selective electrode (ISE) technology on automated analyzers. Sodium, potassium, chloride, and bicarbonate are reported as a panel. Anion gap calculation: Na − (Cl + HCO₃).',
   'Potassium is falsely elevated by hemolysis — inspect all specimens. Report critical K⁺ (< 2.8 or > 6.2 mEq/L) immediately. Avoid gel-barrier tubes for stat electrolytes.'),

  ('Clinical Chemistry', 'Urinalysis (Chemical)',
   'Dip reagent strip into fresh urine. Read results at specified times per manufacturer instructions. Report: specific gravity, pH, protein, glucose, ketones, bilirubin, urobilinogen, blood, nitrite, leukocyte esterase. Correlate with physical and microscopic findings.',
   'Use fresh urine < 2 hours old; refrigerate if delayed. Ascorbic acid can interfere with glucose and blood results. False negatives for nitrite require minimum 4-hour bladder incubation.'),

  ('Clinical Chemistry', 'HbA1c (Glycated Hemoglobin)',
   'Measures percentage of hemoglobin glycated over previous 2–3 months. Methods include HPLC (gold standard), immunoassay, and capillary electrophoresis. Correlates to average plasma glucose using ADA conversion table.',
   'Hemoglobin variants (HbS, HbC, HbE) can interfere with some methods. Use HPLC-based methods for highest accuracy. EDTA specimen; no fasting required.'),

  -- Microbiology
  ('Microbiology', 'Gram Staining',
   'Apply crystal violet (primary stain), iodine (mordant), decolorize with acetone-alcohol, counterstain with safranin. Gram-positive organisms retain purple; gram-negative organisms appear pink-red. Examine under oil immersion. Report morphology, arrangement, and staining reaction.',
   'Decolorization is the most critical step — over-decolorization makes gram-positives appear gram-negative. Perform only inside BSC for respiratory specimens. Dispose of slides in sharps waste.'),

  ('Microbiology', 'Culture & Sensitivity (C&S)',
   'Inoculate appropriate media (BAP, CHOC, MAC) using calibrated loop or swab. Streak for isolation. Incubate at correct temperature/atmosphere (aerobic, CO₂, anaerobic) per specimen type. After 24–48h, identify colonies by morphology, biochemical tests, or MALDI-TOF. Perform AST by disk diffusion or MIC method.',
   'All cultures must be performed inside BSC. Label plates immediately. Autoclave all cultures before disposal. Report critical organisms (MRSA, ESBL, CRKP) immediately per lab protocol.'),

  ('Microbiology', 'KOH Preparation (Fungal)',
   'Mix specimen with 10–20% KOH on slide. Apply coverslip; gently heat to dissolve debris. Examine for fungal elements: hyphae, pseudohyphae, yeast cells, or spores. KOH dissolves keratin and cellular material, leaving fungal structures intact.',
   'Handle KOH solution carefully — caustic. Dermatophyte specimens (skin scrapings, nail) should be collected in clean envelope and processed promptly. Confirm positives with culture.'),

  ('Microbiology', 'AFB Smear (Acid-Fast Bacilli)',
   'Prepare smear from concentrated sputum or direct specimen. Stain with Ziehl-Neelsen (hot method) or Kinyoun (cold method). Examine 300 fields at 100× oil immersion. Report AFB quantity using WHO scale (negative to 3+). Positive smears suggest Mycobacterium sp.',
   'High-risk specimen — perform ALL AFB procedures in a Class II BSC. Use N95 respirator. Patient must be in respiratory isolation. All waste must be autoclaved before disposal.'),

  ('Microbiology', 'Antibiotic Sensitivity Test (AST) — Disk Diffusion',
   'Prepare 0.5 McFarland standard suspension from pure culture. Swab Mueller-Hinton agar evenly. Apply antibiotic disks with dispenser. Incubate 35°C × 16–18h. Measure inhibition zone diameters and interpret using CLSI breakpoint tables (S/I/R).',
   'Use only CLSI/EUCAST-recommended media and incubation conditions. Verify McFarland standard turbidity photometrically. Report cannot be issued without quality control results within acceptable limits.'),

  ('Microbiology', 'Stool Examination (Ova & Parasites)',
   'Direct wet mount: mix small portion of stool with saline (motile trophozoites) and iodine (cysts, eggs). Formal-ether concentration improves sensitivity. Systematically examine under 10× then 40×. Report all parasites found; use reference atlas for identification.',
   'Stool specimens are highly infectious. Wear gloves and handle in BSC. Process within 30 minutes for motile forms; refrigerate for cysts/eggs. Dispose of all materials in biohazard waste.'),

  -- Blood Bank
  ('Blood Bank', 'ABO & Rh Blood Typing',
   'Forward type: test patient RBCs with anti-A, anti-B, anti-D reagents. Reverse type: test patient serum against known A₁ and B RBCs. Results must agree. Rh type reports D antigen; weak D testing performed when initial D is negative in donors/neonates.',
   'Two-person verification of all typing results is mandatory. Discrepancies must be investigated and resolved before issuing any blood product. Document all results in blood bank information system immediately.'),

  ('Blood Bank', 'Compatibility Testing (Crossmatch)',
   'Immediate spin (IS) crossmatch: mix patient serum with donor RBCs, centrifuge, read for agglutination/hemolysis. Full crossmatch adds 37°C incubation and AHG phase. Electronic crossmatch is acceptable if patient has no antibodies and ≥2 previous ABO typings.',
   'Full crossmatch is mandatory for patients with known or suspected antibodies. Never issue blood with positive crossmatch without supervisor authorization. All patient and donor samples must be labeled at bedside.'),

  ('Blood Bank', 'Antibody Screening',
   'Test patient serum against commercial screening cells (2 or 3 cells with known antigen profiles) at IS, 37°C, and AHG phases. Any positive must proceed to antibody identification panel. Common antibodies: anti-E, anti-c, anti-K, anti-Jka, anti-Fya.',
   'Perform antibody identification before issuing antigen-negative blood. Some antibodies (anti-Jka) can disappear and reappear — historical records must always be reviewed. COLD antibodies may require warm specimen handling.'),

  ('Blood Bank', 'Direct Antiglobulin Test (DAT / Direct Coombs)',
   'Test patient RBCs directly with polyspecific AHG (anti-IgG + anti-C3d). Positive result = in-vivo coating of RBCs. Monospecific AHG distinguishes IgG from complement coating. Used in AIHA, HDN, DIIHA, and transfusion reaction workup.',
   'Wash RBCs completely — residual unbound globulin will neutralize AHG and cause false negatives. Check wash adequacy with IgG-sensitized control cells. Report critical results (positive DAT + hemolysis) immediately.'),

  ('Blood Bank', 'Blood Component Preparation',
   'From one whole blood unit: separate PRBCs (centrifuge at 5000×g 5 min), FFP (freeze ≤ −18°C within 8h), platelets (light spin 800×g 10 min, remove plasma). Label with component type, donor ID, ABO/Rh, volume, expiry. Maintain cold chain throughout.',
   'PRBCs: store 1–6°C. FFP: store ≤ −18°C. Platelets: store 20–24°C with agitation. Temperature excursions must be documented and products quarantined pending supervisor review. Two-person check for all component release.'),

  ('Blood Bank', 'Transfusion Reaction Investigation',
   'Collect pre- and post-transfusion samples. Repeat ABO/Rh type on both. Perform DAT, visual check for hemolysis. Review all documentation for clerical error. Culture blood bag if septic reaction suspected. Report findings within hospital-specified timeframe.',
   'Stop transfusion immediately on any suspected reaction. Keep IV line open with saline. Send all samples AND remaining blood unit to blood bank together. Notify attending physician and blood bank supervisor concurrently.'),

  -- Histopathology/Cytology
  ('Histopathology/Cytology', 'Tissue Processing & Embedding',
   'Fix biopsy in 10% neutral buffered formalin (minimum 6–24h depending on size). Process through ascending alcohols, xylene clearing, then paraffin infiltration using automated tissue processor. Embed in mold with correct orientation. Trim face to expose tissue before sectioning.',
   'Formalin is a known carcinogen and respiratory sensitizer — always handle in fume hood wearing chemical-resistant gloves and face protection. Dispose of formalin waste only in labeled chemical waste containers. Log all formalin exposures.'),

  ('Histopathology/Cytology', 'Microtomy & Sectioning',
   'Section paraffin blocks at 3–5 µm using rotary microtome. Float sections on 42°C water bath to remove wrinkles. Mount on charged glass slides. Dry in 60°C oven for 30–60 min before staining. Serially section difficult specimens.',
   'Microtome blades are extremely sharp — always use blade holder or forceps for installation and removal, NEVER use bare fingers. Dispose of used blades in dedicated sharps container. Protect eyes from paraffin shavings.'),

  ('Histopathology/Cytology', 'Hematoxylin & Eosin (H&E) Staining',
   'Deparaffinize in xylene (2×5 min) → rehydrate through graded alcohols → distilled water → Harris hematoxylin (nuclei blue) → acid differentiation → bluing in ammonia water → eosin Y (cytoplasm pink) → dehydrate → clear in xylene → mount with coverslip.',
   'Xylene is toxic and flammable — use only in fume hood. Maintain consistent staining times; log each run with timing, reagent lot, and result. Discard xylene in chemical waste. Never leave deparaffinized slides to dry — they become difficult to rehydrate.'),

  ('Histopathology/Cytology', 'Pap Smear Preparation',
   'Wet-fix immediately with 95% ethanol or spray fixative within 10 seconds of smear to prevent air-drying artifact. For liquid-based cytology (LBC): collect in vial, process by ThinPrep or SurePath method. Stain with Papanicolaou stain. Screen under 10× then examine on 40× for cellular abnormalities.',
   'Rapid fixation is critical — air drying causes irreversible artifact that mimics dysplasia. Label all vials and slides at collection, not after. Cytology specimens are biohazardous — handle accordingly.'),

  ('Histopathology/Cytology', 'Special Stains',
   'Selected based on diagnosis: PAS (fungi, glycogen, basement membrane), Alcian Blue (mucins), Masson Trichrome (collagen/fibrosis), Congo Red (amyloid — green birefringence under polarized light), Reticulin (reticulum fibers), Ziehl-Neelsen (mycobacteria in tissue). Follow validated protocols strictly.',
   'Many special stain reagents are toxic (phenol in some protocols, picric acid in Bouin''s fixative, osmium tetroxide). Review SDS for each reagent. All special stain waste must be segregated and disposed of per chemical waste protocol.'),

  ('Histopathology/Cytology', 'Frozen Section (Intraoperative)',
   'Place fresh, unfixed tissue on cryostat chuck with OCT compound. Freeze rapidly at −20 to −25°C. Section at 5–10 µm. Stain with rapid H&E (accelerated 2–3 min protocol). Report to surgeon within 10–20 minutes of receiving specimen.',
   'Frozen section room must be maintained at biocontainment level — treat all tissue as potentially infectious. Sharp cryostat blade — use safety protocols. Residual frozen tissue must be fixed in formalin and submitted for permanent sections. Never discard intraoperative tissue.');


-- ─────────────────────────────────────────────
-- 6. STORAGE — AVATARS BUCKET
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg','image/jpg','image/png','image/gif','image/webp']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/gif','image/webp'];

drop policy if exists "Avatars are publicly accessible" on storage.objects;
drop policy if exists "Users can upload own avatar"     on storage.objects;
drop policy if exists "Users can update own avatar"     on storage.objects;
drop policy if exists "Users can delete own avatar"     on storage.objects;

create policy "Avatars are publicly accessible"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ─────────────────────────────────────────────
-- 7. STORAGE — DOCUMENTS BUCKET
-- ─────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  true,
  52428800,  -- 50 MB max per file
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = 52428800,
      allowed_mime_types = array[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];

drop policy if exists "Documents are publicly accessible"  on storage.objects;
drop policy if exists "Users can upload own documents"     on storage.objects;
drop policy if exists "Users can update own documents"     on storage.objects;
drop policy if exists "Users can delete own documents"     on storage.objects;

create policy "Documents are publicly accessible"
  on storage.objects for select
  to public
  using (bucket_id = 'documents');

create policy "Users can upload own documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own documents"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );