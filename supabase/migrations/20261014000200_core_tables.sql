-- Genvity :: 0200 — identidade, perfis profissionais e estabelecimentos

-- ---------------------------------------------------------------------------
-- Perfis: dados não sensíveis. Dados pessoais ficam em `patients`, protegidos
-- por políticas mais restritivas.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'patient',
  full_name text not null default '' check (char_length(full_name) <= 160),
  avatar_path text,
  onboarding_completed boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Pacientes
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date check (birth_date is null or birth_date > date '1900-01-01'),
  cpf text unique check (cpf is null or cpf ~ '^[0-9]{11}$'),
  sex text check (sex is null or sex in ('female', 'male', 'other', 'not_informed')),
  phone text check (phone is null or char_length(phone) <= 32),
  city text check (city is null or char_length(city) <= 120),
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  emergency_contact_name text check (emergency_contact_name is null or char_length(emergency_contact_name) <= 160),
  emergency_contact_phone text check (emergency_contact_phone is null or char_length(emergency_contact_phone) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.allergies (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  substance text not null check (char_length(substance) between 2 and 160),
  reaction text check (reaction is null or char_length(reaction) <= 500),
  severity text not null default 'unknown' check (severity in ('mild', 'moderate', 'severe', 'unknown')),
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index allergies_patient_idx on public.allergies (patient_id);

-- ---------------------------------------------------------------------------
-- Médicos
-- ---------------------------------------------------------------------------
create table public.doctors (
  id uuid primary key references public.profiles (id) on delete cascade,
  crm text not null check (crm ~ '^[0-9]{4,10}$'),
  crm_state text not null check (crm_state ~ '^[A-Z]{2}$'),
  specialty text not null check (char_length(specialty) between 2 and 120),
  rqe text check (rqe is null or char_length(rqe) <= 20),
  bio text check (bio is null or char_length(bio) <= 1200),
  city text check (city is null or char_length(city) <= 120),
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  modalities public.appointment_modality[] not null default array['in_person']::public.appointment_modality[],
  accepting_new_patients boolean not null default true,
  messaging_enabled boolean not null default false,
  verification_status public.verification_status not null default 'not_submitted',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (crm, crm_state)
);

create index doctors_verification_idx on public.doctors (verification_status);
create index doctors_specialty_idx on public.doctors (lower(specialty));
create index doctors_city_idx on public.doctors (lower(city), state);

-- ---------------------------------------------------------------------------
-- Farmácias
-- ---------------------------------------------------------------------------
create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  trade_name text not null check (char_length(trade_name) between 2 and 160),
  legal_name text not null check (char_length(legal_name) between 2 and 200),
  cnpj text not null unique check (cnpj ~ '^[0-9]{14}$'),
  afe_number text not null check (char_length(afe_number) between 3 and 40),
  technical_responsible text not null check (char_length(technical_responsible) between 2 and 160),
  technical_responsible_crf text not null check (char_length(technical_responsible_crf) between 3 and 30),
  phone text check (phone is null or char_length(phone) <= 32),
  address_line text not null check (char_length(address_line) between 3 and 240),
  district text check (district is null or char_length(district) <= 120),
  city text not null check (char_length(city) between 2 and 120),
  state text not null check (state ~ '^[A-Z]{2}$'),
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{8}$'),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  opening_hours text check (opening_hours is null or char_length(opening_hours) <= 300),
  verification_status public.verification_status not null default 'not_submitted',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pharmacies_verification_idx on public.pharmacies (verification_status);
create index pharmacies_city_idx on public.pharmacies (lower(city), state);

create table public.pharmacy_members (
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  member_role public.pharmacy_member_role not null default 'attendant',
  created_at timestamptz not null default now(),
  primary key (pharmacy_id, profile_id)
);

create index pharmacy_members_profile_idx on public.pharmacy_members (profile_id);

-- ---------------------------------------------------------------------------
-- Clínicas (base para o plano Genvity Clínicas; gestão de equipes)
-- ---------------------------------------------------------------------------
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  name text not null check (char_length(name) between 2 and 160),
  cnpj text unique check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  created_at timestamptz not null default now()
);

create table public.clinic_members (
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (clinic_id, doctor_id)
);

-- ---------------------------------------------------------------------------
-- Verificação profissional e cadastral
-- ---------------------------------------------------------------------------
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('doctor', 'pharmacy')),
  subject_id uuid not null,
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  status public.verification_status not null default 'under_review',
  document_paths text[] not null default '{}',
  applicant_notes text check (applicant_notes is null or char_length(applicant_notes) <= 1000),
  reviewer_notes text check (reviewer_notes is null or char_length(reviewer_notes) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index verification_requests_status_idx on public.verification_requests (status, created_at);
create index verification_requests_subject_idx on public.verification_requests (subject_type, subject_id);
