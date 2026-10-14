-- Genvity :: 0300 — vínculos, agenda, consultas, prescrições e acompanhamento

-- ---------------------------------------------------------------------------
-- Vínculo médico ↔ paciente e consentimento de compartilhamento
-- ---------------------------------------------------------------------------
create table public.care_relationships (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  status public.care_status not null default 'pending',
  -- Consentimentos granulares concedidos pelo paciente (LGPD art. 11, I).
  share_history boolean not null default false,
  share_documents boolean not null default false,
  consent_updated_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (doctor_id, patient_id)
);

create index care_relationships_patient_idx on public.care_relationships (patient_id, status);
create index care_relationships_doctor_idx on public.care_relationships (doctor_id, status);

create table public.care_invitations (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  email extensions.citext not null,
  status public.invitation_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  responded_at timestamptz
);

create index care_invitations_email_idx on public.care_invitations (email, status);
create unique index care_invitations_pending_unique on public.care_invitations (doctor_id, email) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Agenda
-- ---------------------------------------------------------------------------
create table public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes smallint not null default 30 check (slot_minutes between 10 and 240),
  modality public.appointment_modality not null default 'in_person',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index doctor_availability_doctor_idx on public.doctor_availability (doctor_id, weekday);

create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index schedule_blocks_doctor_idx on public.schedule_blocks (doctor_id, starts_at);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  modality public.appointment_modality not null,
  status public.appointment_status not null default 'requested',
  reason text check (reason is null or char_length(reason) <= 500),
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500),
  cancelled_by uuid references public.profiles (id) on delete set null,
  rescheduled_from uuid references public.appointments (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Impede dupla marcação para o mesmo médico.
  constraint appointments_no_overlap exclude using gist (
    doctor_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('requested', 'confirmed'))
);

create index appointments_doctor_idx on public.appointments (doctor_id, starts_at);
create index appointments_patient_idx on public.appointments (patient_id, starts_at);

-- ---------------------------------------------------------------------------
-- Consultas (registro de atendimento)
-- ---------------------------------------------------------------------------
create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid unique references public.appointments (id) on delete set null,
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  patient_id uuid not null references public.patients (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  reason text check (reason is null or char_length(reason) <= 500),
  summary_for_patient text check (summary_for_patient is null or char_length(summary_for_patient) <= 4000),
  follow_up_date date,
  follow_up_notes text check (follow_up_notes is null or char_length(follow_up_notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index consultations_patient_idx on public.consultations (patient_id, occurred_at desc);
create index consultations_doctor_idx on public.consultations (doctor_id, occurred_at desc);

create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid references public.consultations (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  patient_id uuid not null references public.patients (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 8000),
  shared_with_patient boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clinical_notes_patient_idx on public.clinical_notes (patient_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Catálogo de medicamentos (referência; deve ser substituído/sincronizado com
-- base oficial — CMED/ANVISA — antes da produção)
-- ---------------------------------------------------------------------------
create table public.medications (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 200),
  active_ingredient text check (active_ingredient is null or char_length(active_ingredient) <= 200),
  presentation text not null check (char_length(presentation) between 1 and 200),
  dosage_form text check (dosage_form is null or char_length(dosage_form) <= 80),
  requires_special_control boolean not null default false,
  is_antimicrobial boolean not null default false,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (name, presentation)
);

create index medications_name_idx on public.medications (lower(name));

-- ---------------------------------------------------------------------------
-- Prescrições
-- ---------------------------------------------------------------------------
create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  patient_id uuid not null references public.patients (id) on delete restrict,
  consultation_id uuid references public.consultations (id) on delete set null,
  status public.prescription_status not null default 'draft',
  kind public.prescription_kind not null default 'simple',
  general_instructions text check (general_instructions is null or char_length(general_instructions) <= 2000),
  valid_until date,
  submitted_at timestamptz,
  issued_at timestamptz,
  signed_at timestamptz,
  signature_provider text,
  signature_reference text,
  signature_legally_valid boolean not null default false,
  content_hash text,
  verification_code text unique,
  dispensed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prescriptions_patient_idx on public.prescriptions (patient_id, created_at desc);
create index prescriptions_doctor_idx on public.prescriptions (doctor_id, created_at desc);
create index prescriptions_status_idx on public.prescriptions (status);

create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  position smallint not null default 0,
  medication_id uuid references public.medications (id) on delete set null,
  medication_name text not null check (char_length(medication_name) between 2 and 200),
  presentation text check (presentation is null or char_length(presentation) <= 200),
  dosage text not null check (char_length(dosage) between 1 and 200),
  route text check (route is null or char_length(route) <= 80),
  frequency text not null check (char_length(frequency) between 1 and 200),
  times_per_day smallint check (times_per_day is null or times_per_day between 1 and 24),
  schedule_times time[] not null default '{}',
  duration_days smallint check (duration_days is null or duration_days between 1 and 3650),
  continuous_use boolean not null default false,
  quantity text check (quantity is null or char_length(quantity) <= 120),
  instructions text check (instructions is null or char_length(instructions) <= 1000),
  created_at timestamptz not null default now()
);

create index prescription_items_prescription_idx on public.prescription_items (prescription_id, position);

-- ---------------------------------------------------------------------------
-- Acompanhamento do paciente
-- ---------------------------------------------------------------------------
create table public.patient_medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  source public.medication_source not null default 'personal',
  prescription_id uuid references public.prescriptions (id) on delete set null,
  prescription_item_id uuid references public.prescription_items (id) on delete set null,
  name text not null check (char_length(name) between 2 and 200),
  presentation text check (presentation is null or char_length(presentation) <= 200),
  dosage text check (dosage is null or char_length(dosage) <= 200),
  frequency text check (frequency is null or char_length(frequency) <= 200),
  schedule_times time[] not null default '{}',
  start_date date not null default current_date,
  end_date date,
  instructions text check (instructions is null or char_length(instructions) <= 1000),
  treatment_label text check (treatment_label is null or char_length(treatment_label) <= 120),
  status public.medication_status not null default 'active',
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index patient_medications_patient_idx on public.patient_medications (patient_id, status);

create table public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  patient_medication_id uuid not null references public.patient_medications (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  scheduled_for timestamptz not null,
  status public.dose_status not null,
  note text check (note is null or char_length(note) <= 300),
  logged_at timestamptz not null default now(),
  unique (patient_medication_id, scheduled_for)
);

create index dose_logs_patient_idx on public.dose_logs (patient_id, scheduled_for desc);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  description text check (description is null or char_length(description) <= 500),
  starts_at timestamptz not null,
  all_day boolean not null default false,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index reminders_patient_idx on public.reminders (patient_id, starts_at);

-- ---------------------------------------------------------------------------
-- Documentos médicos (arquivos ficam em bucket privado)
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  kind text not null default 'other' check (kind in ('exam', 'report', 'prescription', 'certificate', 'other')),
  title text not null check (char_length(title) between 2 and 160),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create index documents_patient_idx on public.documents (patient_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Mensagens seguras
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  subject text not null default 'Acompanhamento' check (char_length(subject) between 2 and 160),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index conversations_unique_general on public.conversations (doctor_id, patient_id) where appointment_id is null;
create unique index conversations_unique_appointment on public.conversations (appointment_id) where appointment_id is not null;
create index conversations_patient_idx on public.conversations (patient_id, last_message_at desc);
create index conversations_doctor_idx on public.conversations (doctor_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  document_id uuid references public.documents (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_unread_idx on public.messages (conversation_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Tarefas do médico (assistente de produtividade)
-- ---------------------------------------------------------------------------
create table public.doctor_tasks (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 200),
  notes text check (notes is null or char_length(notes) <= 1000),
  due_date date,
  done boolean not null default false,
  patient_id uuid references public.patients (id) on delete set null,
  created_at timestamptz not null default now()
);

create index doctor_tasks_doctor_idx on public.doctor_tasks (doctor_id, done, due_date);
