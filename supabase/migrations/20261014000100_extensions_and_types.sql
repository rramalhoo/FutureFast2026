-- Genvity :: 0100 — extensões e tipos
-- Extensões ficam no schema `extensions`, conforme recomendação do Supabase.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists citext with schema extensions;

create type public.user_role as enum ('patient', 'doctor', 'pharmacy', 'admin');

create type public.verification_status as enum ('not_submitted', 'under_review', 'approved', 'rejected');

create type public.care_status as enum ('pending', 'active', 'revoked');

create type public.invitation_status as enum ('pending', 'accepted', 'declined', 'expired');

create type public.appointment_modality as enum ('in_person', 'telehealth');

create type public.appointment_status as enum ('requested', 'confirmed', 'completed', 'cancelled', 'no_show');

create type public.prescription_status as enum (
  'draft',
  'pending_signature',
  'issued',
  'dispensed',
  'cancelled',
  'expired'
);

-- Tipos de receituário. Os requisitos de cada tipo (Portaria SVS/MS 344/98,
-- RDC 20/2011 etc.) precisam de revisão regulatória antes do uso em produção.
create type public.prescription_kind as enum ('simple', 'antimicrobial', 'special_control');

create type public.medication_source as enum ('prescription', 'personal');

create type public.medication_status as enum ('active', 'paused', 'completed', 'discontinued');

create type public.dose_status as enum ('taken', 'skipped');

create type public.pharmacy_member_role as enum ('owner', 'pharmacist', 'attendant');

create type public.stock_status as enum ('available', 'low', 'unavailable');

create type public.pharmacy_request_status as enum (
  'received',
  'reviewing',
  'awaiting_stock',
  'preparing',
  'ready',
  'completed',
  'cancelled'
);

create type public.plan_audience as enum ('patient', 'doctor', 'clinic', 'pharmacy');

create type public.subscription_status as enum ('pending', 'trialing', 'active', 'past_due', 'canceled');

create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');

create type public.dsr_kind as enum ('export', 'deletion', 'correction', 'access_report');

create type public.dsr_status as enum ('open', 'in_progress', 'completed', 'rejected');
