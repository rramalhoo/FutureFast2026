-- Genvity :: 0400 — farmácia, negócio, suporte, notificações, auditoria e LGPD

-- ---------------------------------------------------------------------------
-- Estoque informado pela farmácia
-- ---------------------------------------------------------------------------
create table public.pharmacy_inventory (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  medication_id uuid references public.medications (id) on delete set null,
  product_name text not null check (char_length(product_name) between 2 and 200),
  presentation text check (presentation is null or char_length(presentation) <= 200),
  ean text check (ean is null or ean ~ '^[0-9]{8,14}$'),
  quantity integer not null default 0 check (quantity >= 0),
  stock_status public.stock_status not null default 'available',
  -- 'manual' = atualizado por pessoa; 'integration' = sincronizado por sistema externo
  source text not null default 'manual' check (source in ('manual', 'integration')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pharmacy_inventory_pharmacy_idx on public.pharmacy_inventory (pharmacy_id);
create index pharmacy_inventory_name_idx on public.pharmacy_inventory (lower(product_name));

-- ---------------------------------------------------------------------------
-- Solicitações à farmácia e dispensação
-- ---------------------------------------------------------------------------
create table public.pharmacy_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  prescription_id uuid references public.prescriptions (id) on delete set null,
  status public.pharmacy_request_status not null default 'received',
  items_description text check (items_description is null or char_length(items_description) <= 1000),
  patient_note text check (patient_note is null or char_length(patient_note) <= 500),
  pharmacy_note text check (pharmacy_note is null or char_length(pharmacy_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pharmacy_requests_pharmacy_idx on public.pharmacy_requests (pharmacy_id, status, created_at desc);
create index pharmacy_requests_patient_idx on public.pharmacy_requests (patient_id, created_at desc);

create table public.pharmacy_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.pharmacy_requests (id) on delete cascade,
  status public.pharmacy_request_status not null,
  note text check (note is null or char_length(note) <= 500),
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index pharmacy_request_events_request_idx on public.pharmacy_request_events (request_id, created_at);

create table public.prescription_pharmacy_access (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  accessed_by uuid not null references public.profiles (id) on delete cascade,
  accessed_at timestamptz not null default now()
);

create index prescription_pharmacy_access_idx on public.prescription_pharmacy_access (pharmacy_id, accessed_at desc);

create table public.dispensations (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete restrict,
  pharmacy_id uuid not null references public.pharmacies (id) on delete restrict,
  request_id uuid references public.pharmacy_requests (id) on delete set null,
  registered_by uuid not null references public.profiles (id) on delete restrict,
  pharmacist_name text not null check (char_length(pharmacist_name) between 2 and 160),
  pharmacist_crf text not null check (char_length(pharmacist_crf) between 3 and 30),
  notes text check (notes is null or char_length(notes) <= 1000),
  signature_legally_valid boolean not null,
  dispensed_at timestamptz not null default now()
);

create index dispensations_prescription_idx on public.dispensations (prescription_id);
create index dispensations_pharmacy_idx on public.dispensations (pharmacy_id, dispensed_at desc);

-- ---------------------------------------------------------------------------
-- Planos, assinaturas e pagamentos (sem gateway integrado)
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  audience public.plan_audience not null,
  description text not null default '',
  price_min_cents integer check (price_min_cents is null or price_min_cents >= 0),
  price_max_cents integer check (price_max_cents is null or price_max_cents >= 0),
  custom_pricing boolean not null default false,
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  features text[] not null default '{}',
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  status public.subscription_status not null default 'pending',
  amount_cents integer not null default 0 check (amount_cents >= 0),
  provider text not null default 'none',
  provider_reference text,
  started_at timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_one_open_per_profile on public.subscriptions (profile_id)
  where status in ('pending', 'trialing', 'active', 'past_due');
create index subscriptions_status_idx on public.subscriptions (status);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  status public.payment_status not null default 'pending',
  provider text not null default 'manual',
  provider_reference text,
  paid_at timestamptz,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index payments_subscription_idx on public.payments (subscription_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Suporte
-- ---------------------------------------------------------------------------
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  category text not null default 'general' check (category in ('general', 'account', 'technical', 'privacy', 'billing', 'verification')),
  subject text not null check (char_length(subject) between 3 and 160),
  body text not null check (char_length(body) between 10 and 4000),
  status public.ticket_status not null default 'open',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  admin_response text check (admin_response is null or char_length(admin_response) <= 4000),
  responded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_status_idx on public.support_tickets (status, created_at desc);
create index support_tickets_requester_idx on public.support_tickets (requester_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Notificações in-app
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text check (link is null or link ~ '^/[A-Za-z0-9/_\-?=&%.]*$'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Auditoria (somente inserção via funções SECURITY DEFINER)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role public.user_role,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  subject_user_id uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_subject_idx on public.audit_logs (subject_user_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Configurações da plataforma
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z0-9_.]{2,80}$'),
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- LGPD — solicitações de titulares
-- ---------------------------------------------------------------------------
create table public.data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.dsr_kind not null,
  status public.dsr_status not null default 'open',
  details text check (details is null or char_length(details) <= 2000),
  resolution_notes text check (resolution_notes is null or char_length(resolution_notes) <= 2000),
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index data_subject_requests_status_idx on public.data_subject_requests (status, created_at);

-- ---------------------------------------------------------------------------
-- Favoritos
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('doctor', 'pharmacy')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

-- ---------------------------------------------------------------------------
-- Limitação de requisições (janela fixa)
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
