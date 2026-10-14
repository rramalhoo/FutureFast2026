-- Genvity :: 0700 — funções de negócio (RPC)
-- Cada função valida o chamador; nenhuma confia em IDs vindos do cliente
-- sem verificar vínculo/permissão.

-- Restringe os auxiliares de vínculo a quem participa da relação (evita sondagem).
create or replace function public.has_care_access(p_doctor uuid, p_patient uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (auth.uid() in (p_doctor, p_patient) or auth.role() = 'service_role')
    and exists (
      select 1 from public.care_relationships c
      where c.doctor_id = p_doctor and c.patient_id = p_patient and c.status = 'active'
    )
$$;

create or replace function public.has_history_access(p_doctor uuid, p_patient uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (auth.uid() in (p_doctor, p_patient) or auth.role() = 'service_role')
    and exists (
      select 1 from public.care_relationships c
      where c.doctor_id = p_doctor and c.patient_id = p_patient
        and c.status = 'active' and c.share_history
    )
$$;

create or replace function public.has_documents_access(p_doctor uuid, p_patient uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (auth.uid() in (p_doctor, p_patient) or auth.role() = 'service_role')
    and exists (
      select 1 from public.care_relationships c
      where c.doctor_id = p_doctor and c.patient_id = p_patient
        and c.status = 'active' and c.share_documents
    )
$$;

create or replace function public.require_role(p_role public.user_role)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = '42501';
  end if;
  if (select role from public.profiles where id = auth.uid()) is distinct from p_role then
    raise exception 'Operação não permitida para este tipo de conta.' using errcode = '42501';
  end if;
end;
$$;

-- ===========================================================================
-- Onboarding
-- ===========================================================================
create or replace function public.complete_patient_onboarding(
  p_full_name text,
  p_birth_date date,
  p_phone text,
  p_city text,
  p_state text,
  p_cpf text default null,
  p_sex text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.require_role('patient');

  update public.profiles
     set full_name = left(trim(p_full_name), 160), onboarding_completed = true
   where id = auth.uid();

  insert into public.patients (id, birth_date, phone, city, state, cpf, sex)
  values (auth.uid(), p_birth_date, nullif(trim(p_phone), ''), nullif(trim(p_city), ''),
          nullif(upper(trim(p_state)), ''), nullif(p_cpf, ''), nullif(p_sex, ''))
  on conflict (id) do update set
    birth_date = excluded.birth_date,
    phone = excluded.phone,
    city = excluded.city,
    state = excluded.state,
    cpf = coalesce(excluded.cpf, public.patients.cpf),
    sex = coalesce(excluded.sex, public.patients.sex);

  perform public.write_audit('onboarding.completed', 'profile', auth.uid(), auth.uid(), '{"role":"patient"}');
end;
$$;

create or replace function public.complete_doctor_onboarding(
  p_full_name text,
  p_crm text,
  p_crm_state text,
  p_specialty text,
  p_rqe text,
  p_city text,
  p_state text,
  p_modalities public.appointment_modality[],
  p_bio text,
  p_document_paths text[]
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_request uuid;
  v_path text;
  v_current public.verification_status;
begin
  perform public.require_role('doctor');

  if coalesce(array_length(p_document_paths, 1), 0) = 0 then
    raise exception 'Envie ao menos um documento para verificação do CRM.' using errcode = '22023';
  end if;
  foreach v_path in array p_document_paths loop
    if split_part(v_path, '/', 1) <> auth.uid()::text then
      raise exception 'Documento inválido.' using errcode = '42501';
    end if;
  end loop;

  select verification_status into v_current from public.doctors where id = auth.uid();
  if v_current = 'approved' then
    raise exception 'Seu cadastro já está verificado.' using errcode = '22023';
  end if;

  update public.profiles set full_name = left(trim(p_full_name), 160), onboarding_completed = true
   where id = auth.uid();

  perform set_config('genvity.trusted', 'on', true);
  insert into public.doctors (id, crm, crm_state, specialty, rqe, city, state, modalities, bio, verification_status)
  values (auth.uid(), p_crm, upper(p_crm_state), trim(p_specialty), nullif(trim(p_rqe), ''),
          nullif(trim(p_city), ''), nullif(upper(trim(p_state)), ''),
          coalesce(p_modalities, array['in_person']::public.appointment_modality[]),
          nullif(trim(p_bio), ''), 'under_review')
  on conflict (id) do update set
    crm = excluded.crm, crm_state = excluded.crm_state, specialty = excluded.specialty,
    rqe = excluded.rqe, city = excluded.city, state = excluded.state,
    modalities = excluded.modalities, bio = excluded.bio, verification_status = 'under_review';
  perform set_config('genvity.trusted', 'off', true);

  insert into public.verification_requests (subject_type, subject_id, submitted_by, document_paths)
  values ('doctor', auth.uid(), auth.uid(), p_document_paths)
  returning id into v_request;

  perform public.write_audit('verification.submitted', 'doctor', auth.uid(), auth.uid(), '{}'::jsonb);
  return v_request;
end;
$$;

create or replace function public.complete_pharmacy_onboarding(
  p_full_name text,
  p_trade_name text,
  p_legal_name text,
  p_cnpj text,
  p_afe_number text,
  p_technical_responsible text,
  p_technical_responsible_crf text,
  p_phone text,
  p_address_line text,
  p_district text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_latitude double precision,
  p_longitude double precision,
  p_opening_hours text,
  p_document_paths text[]
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_pharmacy uuid;
  v_path text;
begin
  perform public.require_role('pharmacy');

  if coalesce(array_length(p_document_paths, 1), 0) = 0 then
    raise exception 'Envie os documentos de autorização da farmácia.' using errcode = '22023';
  end if;
  foreach v_path in array p_document_paths loop
    if split_part(v_path, '/', 1) <> auth.uid()::text then
      raise exception 'Documento inválido.' using errcode = '42501';
    end if;
  end loop;

  update public.profiles set full_name = left(trim(p_full_name), 160), onboarding_completed = true
   where id = auth.uid();

  select id into v_pharmacy from public.pharmacies where owner_id = auth.uid();

  perform set_config('genvity.trusted', 'on', true);
  if v_pharmacy is null then
    insert into public.pharmacies (
      owner_id, trade_name, legal_name, cnpj, afe_number, technical_responsible,
      technical_responsible_crf, phone, address_line, district, city, state, postal_code,
      latitude, longitude, opening_hours, verification_status
    ) values (
      auth.uid(), trim(p_trade_name), trim(p_legal_name), p_cnpj, trim(p_afe_number),
      trim(p_technical_responsible), trim(p_technical_responsible_crf), nullif(trim(p_phone), ''),
      trim(p_address_line), nullif(trim(p_district), ''), trim(p_city), upper(p_state),
      nullif(p_postal_code, ''), p_latitude, p_longitude, nullif(trim(p_opening_hours), ''), 'under_review'
    ) returning id into v_pharmacy;

    insert into public.pharmacy_members (pharmacy_id, profile_id, member_role)
    values (v_pharmacy, auth.uid(), 'owner');
  else
    if (select verification_status from public.pharmacies where id = v_pharmacy) = 'approved' then
      raise exception 'Esta farmácia já está verificada.' using errcode = '22023';
    end if;
    update public.pharmacies set
      trade_name = trim(p_trade_name), legal_name = trim(p_legal_name), cnpj = p_cnpj,
      afe_number = trim(p_afe_number), technical_responsible = trim(p_technical_responsible),
      technical_responsible_crf = trim(p_technical_responsible_crf), phone = nullif(trim(p_phone), ''),
      address_line = trim(p_address_line), district = nullif(trim(p_district), ''), city = trim(p_city),
      state = upper(p_state), postal_code = nullif(p_postal_code, ''), latitude = p_latitude,
      longitude = p_longitude, opening_hours = nullif(trim(p_opening_hours), ''),
      verification_status = 'under_review'
    where id = v_pharmacy;
  end if;
  perform set_config('genvity.trusted', 'off', true);

  insert into public.verification_requests (subject_type, subject_id, submitted_by, document_paths)
  values ('pharmacy', v_pharmacy, auth.uid(), p_document_paths);

  perform public.write_audit('verification.submitted', 'pharmacy', v_pharmacy, auth.uid(), '{}'::jsonb);
  return v_pharmacy;
end;
$$;

create or replace function public.admin_review_verification(p_request uuid, p_approve boolean, p_notes text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.verification_requests;
  v_status public.verification_status := case when p_approve then 'approved' else 'rejected' end;
begin
  if not public.is_admin() then
    raise exception 'Acesso restrito à administração.' using errcode = '42501';
  end if;
  if not p_approve and coalesce(trim(p_notes), '') = '' then
    raise exception 'Informe o motivo da recusa.' using errcode = '22023';
  end if;

  select * into v_req from public.verification_requests where id = p_request for update;
  if not found or v_req.status <> 'under_review' then
    raise exception 'Solicitação não encontrada ou já analisada.' using errcode = '22023';
  end if;

  update public.verification_requests
     set status = v_status, reviewer_notes = nullif(trim(p_notes), ''), reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_request;

  perform set_config('genvity.trusted', 'on', true);
  if v_req.subject_type = 'doctor' then
    update public.doctors
       set verification_status = v_status, verified_at = case when p_approve then now() else null end
     where id = v_req.subject_id;
  else
    update public.pharmacies
       set verification_status = v_status, verified_at = case when p_approve then now() else null end
     where id = v_req.subject_id;
  end if;
  perform set_config('genvity.trusted', 'off', true);

  perform public.write_audit('verification.' || v_status::text, v_req.subject_type, v_req.subject_id, v_req.submitted_by,
    jsonb_build_object('request_id', p_request));

  perform public.notify(
    v_req.submitted_by, 'verification',
    case when p_approve then 'Cadastro verificado' else 'Verificação não aprovada' end,
    case when p_approve then 'Seu cadastro foi aprovado. Todos os recursos profissionais estão liberados.'
         else 'Revise as observações da equipe e reenvie seus documentos.' end,
    '/conta'
  );
end;
$$;

-- ===========================================================================
-- Agenda e consultas
-- ===========================================================================
create or replace function public.get_available_slots(p_doctor uuid, p_from date default current_date, p_days integer default 14)
returns table (starts_at timestamptz, ends_at timestamptz, modality public.appointment_modality)
language sql stable security definer set search_path = ''
as $$
  with days as (
    select gs::date as day
    from generate_series(p_from::timestamp, (p_from + (least(greatest(p_days, 1), 60) - 1))::timestamp, interval '1 day') gs
  ),
  raw as (
    select
      ((dy.day + a.start_time) at time zone 'America/Sao_Paulo') + make_interval(mins => (s * a.slot_minutes)::int) as slot_start,
      a.slot_minutes::int as minutes,
      a.modality
    from days dy
    join public.doctor_availability a
      on a.doctor_id = p_doctor and a.weekday = extract(dow from dy.day)::int
    cross join lateral generate_series(
      0, floor(extract(epoch from (a.end_time - a.start_time)) / 60 / a.slot_minutes)::int - 1
    ) s
  )
  select r.slot_start, r.slot_start + make_interval(mins => r.minutes), r.modality
  from raw r
  where public.is_verified_doctor(p_doctor)
    and r.slot_start > now() + interval '1 hour'
    and not exists (
      select 1 from public.appointments ap
      where ap.doctor_id = p_doctor and ap.status in ('requested', 'confirmed')
        and tstzrange(ap.starts_at, ap.ends_at, '[)') && tstzrange(r.slot_start, r.slot_start + make_interval(mins => r.minutes), '[)')
    )
    and not exists (
      select 1 from public.schedule_blocks b
      where b.doctor_id = p_doctor
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(r.slot_start, r.slot_start + make_interval(mins => r.minutes), '[)')
    )
  order by 1
$$;

create or replace function public.search_doctors(
  p_query text default null,
  p_specialty text default null,
  p_city text default null,
  p_modality public.appointment_modality default null,
  p_only_available boolean default false
)
returns table (
  id uuid,
  full_name text,
  specialty text,
  crm text,
  crm_state text,
  rqe text,
  city text,
  state text,
  modalities public.appointment_modality[],
  bio text,
  accepting_new_patients boolean,
  messaging_enabled boolean,
  next_slot timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select * from (
    select
      d.id, p.full_name, d.specialty, d.crm, d.crm_state, d.rqe, d.city, d.state,
      d.modalities, d.bio, d.accepting_new_patients, d.messaging_enabled,
      (select min(s.starts_at) from public.get_available_slots(d.id, current_date, 21) s
        where p_modality is null or s.modality = p_modality) as next_slot
    from public.doctors d
    join public.profiles p on p.id = d.id
    where auth.uid() is not null
      and d.verification_status = 'approved'
      and (coalesce(p_query, '') = '' or p.full_name ilike '%' || replace(replace(p_query, '%', ''), '_', '') || '%'
           or d.specialty ilike '%' || replace(replace(p_query, '%', ''), '_', '') || '%')
      and (coalesce(p_specialty, '') = '' or d.specialty ilike '%' || replace(replace(p_specialty, '%', ''), '_', '') || '%')
      and (coalesce(p_city, '') = '' or d.city ilike '%' || replace(replace(p_city, '%', ''), '_', '') || '%')
      and (p_modality is null or p_modality = any (d.modalities))
  ) x
  where not p_only_available or x.next_slot is not null
  -- Ordenação neutra: disponibilidade e nome. Nunca por pagamento.
  order by x.next_slot nulls last, x.full_name
  limit 60
$$;

create or replace function public.request_appointment(
  p_doctor uuid,
  p_starts_at timestamptz,
  p_modality public.appointment_modality,
  p_reason text,
  p_share_history boolean default false,
  p_share_documents boolean default false
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_slot record;
  v_id uuid;
begin
  perform public.require_role('patient');
  if not exists (select 1 from public.patients where id = auth.uid()) then
    raise exception 'Conclua seu cadastro antes de agendar.' using errcode = '22023';
  end if;
  perform public.enforce_rate_limit('appt:' || auth.uid()::text, 10, 3600);

  if not exists (select 1 from public.doctors where id = p_doctor and verification_status = 'approved' and accepting_new_patients)
     and not public.has_care_access(p_doctor, auth.uid()) then
    raise exception 'Este profissional não está recebendo novos pacientes.' using errcode = '22023';
  end if;

  select * into v_slot
  from public.get_available_slots(p_doctor, (p_starts_at at time zone 'America/Sao_Paulo')::date, 1) s
  where s.starts_at = p_starts_at and s.modality = p_modality;

  if not found then
    raise exception 'Este horário não está mais disponível.' using errcode = '22023';
  end if;

  insert into public.appointments (doctor_id, patient_id, starts_at, ends_at, modality, status, reason, created_by)
  values (p_doctor, auth.uid(), v_slot.starts_at, v_slot.ends_at, p_modality, 'requested', nullif(trim(p_reason), ''), auth.uid())
  returning id into v_id;

  insert into public.care_relationships (doctor_id, patient_id, status, share_history, share_documents)
  values (p_doctor, auth.uid(), 'pending', p_share_history, p_share_documents)
  on conflict (doctor_id, patient_id) do update set
    status = case when public.care_relationships.status = 'revoked' then 'pending'::public.care_status
                  else public.care_relationships.status end,
    share_history = excluded.share_history,
    share_documents = excluded.share_documents,
    consent_updated_at = now();

  return v_id;
end;
$$;

create or replace function public.doctor_update_appointment(p_id uuid, p_action text, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_appt public.appointments;
begin
  select * into v_appt from public.appointments where id = p_id and doctor_id = auth.uid() for update;
  if not found then
    raise exception 'Consulta não encontrada.' using errcode = '42501';
  end if;
  if not public.is_verified_doctor() then
    raise exception 'Seu cadastro ainda não foi verificado.' using errcode = '42501';
  end if;

  if p_action = 'confirm' and v_appt.status = 'requested' then
    update public.appointments set status = 'confirmed', confirmed_at = now() where id = p_id;
    update public.care_relationships
       set status = 'active', activated_at = coalesce(activated_at, now()), revoked_at = null
     where doctor_id = v_appt.doctor_id and patient_id = v_appt.patient_id;
  elsif p_action = 'decline' and v_appt.status = 'requested' then
    update public.appointments set status = 'cancelled', cancelled_by = auth.uid(),
      cancellation_reason = coalesce(nullif(trim(p_reason), ''), 'Horário indisponível') where id = p_id;
  elsif p_action = 'cancel' and v_appt.status = 'confirmed' then
    if coalesce(trim(p_reason), '') = '' then
      raise exception 'Informe o motivo do cancelamento.' using errcode = '22023';
    end if;
    update public.appointments set status = 'cancelled', cancelled_by = auth.uid(), cancellation_reason = trim(p_reason)
     where id = p_id;
  elsif p_action = 'complete' and v_appt.status = 'confirmed' then
    if v_appt.starts_at > now() + interval '1 hour' then
      raise exception 'A consulta ainda não aconteceu.' using errcode = '22023';
    end if;
    update public.appointments set status = 'completed' where id = p_id;
  elsif p_action = 'no_show' and v_appt.status = 'confirmed' then
    if v_appt.starts_at > now() then
      raise exception 'A consulta ainda não aconteceu.' using errcode = '22023';
    end if;
    update public.appointments set status = 'no_show' where id = p_id;
  else
    raise exception 'Ação inválida para o status atual da consulta.' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.patient_cancel_appointment(p_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.appointments
     set status = 'cancelled', cancelled_by = auth.uid(),
         cancellation_reason = coalesce(nullif(trim(p_reason), ''), 'Cancelada pelo paciente')
   where id = p_id and patient_id = auth.uid() and status in ('requested', 'confirmed');
  if not found then
    raise exception 'Consulta não encontrada ou não pode mais ser cancelada.' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.reschedule_appointment(p_id uuid, p_new_start timestamptz)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_appt public.appointments;
  v_slot record;
  v_new uuid;
  v_by_doctor boolean;
begin
  select * into v_appt from public.appointments
   where id = p_id and (doctor_id = auth.uid() or patient_id = auth.uid()) for update;
  if not found or v_appt.status not in ('requested', 'confirmed') then
    raise exception 'Consulta não encontrada ou não pode ser remarcada.' using errcode = '22023';
  end if;
  v_by_doctor := v_appt.doctor_id = auth.uid();

  update public.appointments set status = 'cancelled', cancelled_by = auth.uid(), cancellation_reason = 'Remarcada'
   where id = p_id;

  select * into v_slot
  from public.get_available_slots(v_appt.doctor_id, (p_new_start at time zone 'America/Sao_Paulo')::date, 1) s
  where s.starts_at = p_new_start and s.modality = v_appt.modality;
  if not found then
    raise exception 'O novo horário não está disponível.' using errcode = '22023';
  end if;

  insert into public.appointments (
    doctor_id, patient_id, starts_at, ends_at, modality, status, reason, rescheduled_from, created_by, confirmed_at
  ) values (
    v_appt.doctor_id, v_appt.patient_id, v_slot.starts_at, v_slot.ends_at, v_appt.modality,
    case when v_by_doctor then 'confirmed'::public.appointment_status else 'requested'::public.appointment_status end,
    v_appt.reason, p_id, auth.uid(), case when v_by_doctor then now() end
  ) returning id into v_new;

  return v_new;
end;
$$;

create or replace function public.doctor_schedule_appointment(
  p_patient uuid,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_modality public.appointment_modality,
  p_reason text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_verified_doctor() or not public.has_care_access(auth.uid(), p_patient) then
    raise exception 'Paciente não vinculado ou cadastro não verificado.' using errcode = '42501';
  end if;
  if p_starts_at < now() then
    raise exception 'Escolha um horário futuro.' using errcode = '22023';
  end if;
  if p_duration_minutes not between 10 and 240 then
    raise exception 'Duração inválida.' using errcode = '22023';
  end if;

  begin
    insert into public.appointments (doctor_id, patient_id, starts_at, ends_at, modality, status, reason, created_by, confirmed_at)
    values (auth.uid(), p_patient, p_starts_at, p_starts_at + make_interval(mins => p_duration_minutes), p_modality,
            'confirmed', nullif(trim(p_reason), ''), auth.uid(), now())
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Já existe uma consulta neste horário.' using errcode = '22023';
  end;
  return v_id;
end;
$$;

-- ===========================================================================
-- Vínculos e consentimentos
-- ===========================================================================
create or replace function public.invite_patient(p_email text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_target uuid;
begin
  if not public.is_verified_doctor() then
    raise exception 'Seu cadastro ainda não foi verificado.' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('invite:' || auth.uid()::text, 20, 3600);

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;

  insert into public.care_invitations (doctor_id, email)
  values (auth.uid(), v_email)
  on conflict (doctor_id, email) where status = 'pending' do update set expires_at = now() + interval '14 days';

  -- Notifica somente se existir paciente; a resposta ao médico é sempre a mesma
  -- (proteção contra enumeração de contas).
  select u.id into v_target
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = v_email and p.role = 'patient';

  if v_target is not null then
    perform public.notify(v_target, 'invitation', 'Convite de acompanhamento',
      'Um médico convidou você para acompanhamento no Genvity.', '/paciente/medicos?tab=convites');
  end if;

  perform public.write_audit('care.invited', 'care_invitation', null, null, '{}'::jsonb);
end;
$$;

create or replace function public.respond_invitation(
  p_id uuid,
  p_accept boolean,
  p_share_history boolean default false,
  p_share_documents boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_inv public.care_invitations;
begin
  perform public.require_role('patient');
  select * into v_inv from public.care_invitations
   where id = p_id and email = (auth.jwt() ->> 'email') and status = 'pending' and expires_at > now()
   for update;
  if not found then
    raise exception 'Convite não encontrado ou expirado.' using errcode = '22023';
  end if;
  if p_accept and not exists (select 1 from public.patients where id = auth.uid()) then
    raise exception 'Conclua seu cadastro antes de aceitar convites.' using errcode = '22023';
  end if;

  update public.care_invitations
     set status = case when p_accept then 'accepted'::public.invitation_status else 'declined'::public.invitation_status end,
         responded_at = now()
   where id = p_id;

  if p_accept then
    insert into public.care_relationships (doctor_id, patient_id, status, share_history, share_documents, activated_at)
    values (v_inv.doctor_id, auth.uid(), 'active', p_share_history, p_share_documents, now())
    on conflict (doctor_id, patient_id) do update set
      status = 'active', share_history = excluded.share_history, share_documents = excluded.share_documents,
      activated_at = coalesce(public.care_relationships.activated_at, now()), revoked_at = null,
      consent_updated_at = now();
    perform public.notify(v_inv.doctor_id, 'invitation', 'Convite aceito',
      'Um paciente aceitou seu convite de acompanhamento.', '/medico/pacientes');
  end if;
end;
$$;

create or replace function public.update_care_consent(p_doctor uuid, p_share_history boolean, p_share_documents boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.care_relationships
     set share_history = p_share_history, share_documents = p_share_documents, consent_updated_at = now()
   where doctor_id = p_doctor and patient_id = auth.uid() and status <> 'revoked';
  if not found then
    raise exception 'Vínculo não encontrado.' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.revoke_care(p_counterpart uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.care_relationships
     set status = 'revoked', share_history = false, share_documents = false,
         revoked_at = now(), revoked_by = auth.uid(), consent_updated_at = now()
   where status <> 'revoked'
     and ((patient_id = auth.uid() and doctor_id = p_counterpart)
       or (doctor_id = auth.uid() and patient_id = p_counterpart));
  if not found then
    raise exception 'Vínculo não encontrado.' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.log_patient_record_access(p_patient uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_care_access(auth.uid(), p_patient) then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;
  perform public.write_audit('patient_record.viewed', 'patient', p_patient, p_patient, '{}'::jsonb);
end;
$$;

-- ===========================================================================
-- Prescrições
-- ===========================================================================
create or replace function public.compute_prescription_hash(p_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select encode(extensions.digest(convert_to(jsonb_build_object(
    'id', p.id,
    'doctor_id', p.doctor_id,
    'patient_id', p.patient_id,
    'kind', p.kind,
    'general_instructions', p.general_instructions,
    'valid_until', p.valid_until,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'medication_name', i.medication_name, 'presentation', i.presentation, 'dosage', i.dosage,
        'route', i.route, 'frequency', i.frequency, 'times_per_day', i.times_per_day,
        'schedule_times', i.schedule_times, 'duration_days', i.duration_days,
        'continuous_use', i.continuous_use, 'quantity', i.quantity, 'instructions', i.instructions
      ) order by i.position, i.id)
      from public.prescription_items i where i.prescription_id = p.id
    ), '[]'::jsonb)
  )::text, 'UTF8'), 'sha256'), 'hex')
  from public.prescriptions p
  where p.id = p_id
$$;

create or replace function public.submit_prescription(p_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_rx public.prescriptions;
  v_hash text;
  v_max_days integer;
begin
  select * into v_rx from public.prescriptions where id = p_id and doctor_id = auth.uid() for update;
  if not found or v_rx.status <> 'draft' then
    raise exception 'Prescrição não encontrada ou não está em rascunho.' using errcode = '22023';
  end if;
  if not public.is_verified_doctor() or not public.has_care_access(auth.uid(), v_rx.patient_id) then
    raise exception 'Vínculo com o paciente ou verificação profissional ausente.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.prescription_items where prescription_id = p_id) then
    raise exception 'Adicione ao menos um medicamento.' using errcode = '22023';
  end if;
  if v_rx.valid_until is null or v_rx.valid_until < current_date then
    raise exception 'Informe uma validade futura para a prescrição.' using errcode = '22023';
  end if;

  v_max_days := case v_rx.kind
    when 'antimicrobial' then coalesce((select (value ->> 'antimicrobial')::int from public.platform_settings where key = 'prescription.max_validity_days'), 10)
    when 'special_control' then coalesce((select (value ->> 'special_control')::int from public.platform_settings where key = 'prescription.max_validity_days'), 30)
    else coalesce((select (value ->> 'simple')::int from public.platform_settings where key = 'prescription.max_validity_days'), 365)
  end;
  if v_rx.valid_until > current_date + v_max_days then
    raise exception 'A validade excede o limite configurado para este tipo de receita (% dias).', v_max_days using errcode = '22023';
  end if;

  v_hash := public.compute_prescription_hash(p_id);
  perform set_config('genvity.trusted', 'on', true);
  update public.prescriptions
     set status = 'pending_signature', submitted_at = now(), content_hash = v_hash
   where id = p_id;
  perform set_config('genvity.trusted', 'off', true);
  return v_hash;
end;
$$;

create or replace function public.return_prescription_to_draft(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform set_config('genvity.trusted', 'on', true);
  update public.prescriptions
     set status = 'draft', submitted_at = null, content_hash = null
   where id = p_id and doctor_id = auth.uid() and status = 'pending_signature';
  if not found then
    raise exception 'Prescrição não encontrada ou não está aguardando assinatura.' using errcode = '22023';
  end if;
  perform set_config('genvity.trusted', 'off', true);
end;
$$;

-- Executada SOMENTE pelo servidor (service_role) depois que o provedor de
-- assinatura confirma a assinatura do hash. Nunca exposta a clientes.
create or replace function public.finalize_prescription_issue(
  p_id uuid,
  p_actor uuid,
  p_signed_hash text,
  p_provider text,
  p_reference text,
  p_legally_valid boolean
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_rx public.prescriptions;
  v_code text;
  v_item record;
  v_times time[];
  v_n integer;
begin
  select * into v_rx from public.prescriptions where id = p_id for update;
  if not found or v_rx.status <> 'pending_signature' then
    raise exception 'Prescrição não está aguardando assinatura.' using errcode = '22023';
  end if;
  if v_rx.doctor_id <> p_actor then
    raise exception 'Somente o médico autor pode emitir esta prescrição.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.doctors where id = p_actor and verification_status = 'approved') then
    raise exception 'Cadastro profissional não verificado.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.care_relationships c where c.doctor_id = p_actor and c.patient_id = v_rx.patient_id and c.status = 'active') then
    raise exception 'Vínculo com o paciente inativo.' using errcode = '42501';
  end if;
  if v_rx.content_hash is distinct from p_signed_hash or public.compute_prescription_hash(p_id) <> p_signed_hash then
    raise exception 'O conteúdo assinado não confere com a prescrição.' using errcode = '22023';
  end if;

  v_code := encode(extensions.gen_random_bytes(16), 'hex');

  perform set_config('genvity.trusted', 'on', true);
  update public.prescriptions
     set status = 'issued', issued_at = now(), signed_at = now(), signature_provider = p_provider,
         signature_reference = p_reference, signature_legally_valid = coalesce(p_legally_valid, false),
         verification_code = v_code
   where id = p_id;

  for v_item in select * from public.prescription_items where prescription_id = p_id order by position, id loop
    v_n := coalesce(v_item.times_per_day, 0);
    if coalesce(array_length(v_item.schedule_times, 1), 0) > 0 then
      v_times := v_item.schedule_times;
    elsif v_n > 0 then
      select array_agg((time '08:00' + make_interval(mins => (k * (1440 / v_n))::int)) order by k)
        into v_times from generate_series(0, v_n - 1) k;
    else
      v_times := '{}';
    end if;

    insert into public.patient_medications (
      patient_id, source, prescription_id, prescription_item_id, name, presentation, dosage,
      frequency, schedule_times, start_date, end_date, instructions, treatment_label, status
    ) values (
      v_rx.patient_id, 'prescription', p_id, v_item.id, v_item.medication_name, v_item.presentation,
      v_item.dosage, v_item.frequency, v_times, current_date,
      case when v_item.continuous_use or v_item.duration_days is null then null
           else current_date + (v_item.duration_days - 1) end,
      v_item.instructions,
      (select d.specialty from public.doctors d where d.id = v_rx.doctor_id),
      'active'
    );
  end loop;
  perform set_config('genvity.trusted', 'off', true);

  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, subject_user_id, metadata)
  values (p_actor, 'doctor', 'prescription.issued', 'prescription', p_id, v_rx.patient_id,
          jsonb_build_object('provider', p_provider, 'legally_valid', coalesce(p_legally_valid, false)));

  perform public.notify(v_rx.patient_id, 'prescription', 'Nova receita disponível',
    'Seu médico emitiu uma nova receita digital.', '/paciente/receitas/' || p_id::text);
  return v_code;
end;
$$;

create or replace function public.cancel_prescription(p_id uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_rx public.prescriptions;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Informe o motivo do cancelamento.' using errcode = '22023';
  end if;
  select * into v_rx from public.prescriptions where id = p_id and doctor_id = auth.uid() for update;
  if not found or v_rx.status not in ('pending_signature', 'issued') then
    raise exception 'Somente receitas aguardando assinatura ou emitidas (não dispensadas) podem ser canceladas.' using errcode = '22023';
  end if;

  perform set_config('genvity.trusted', 'on', true);
  update public.prescriptions
     set status = 'cancelled', cancelled_at = now(), cancellation_reason = trim(p_reason)
   where id = p_id;
  update public.patient_medications set status = 'discontinued'
   where prescription_id = p_id and status in ('active', 'paused');
  perform set_config('genvity.trusted', 'off', true);

  if v_rx.status = 'issued' then
    perform public.notify(v_rx.patient_id, 'prescription', 'Receita cancelada',
      'Uma receita foi cancelada pelo médico. Veja o motivo nos detalhes.', '/paciente/receitas/' || p_id::text);
  end if;
end;
$$;

create or replace function public.expire_prescriptions()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('genvity.trusted', 'on', true);
  update public.prescriptions set status = 'expired'
   where status = 'issued' and valid_until < current_date;
  get diagnostics v_count = row_count;
  perform set_config('genvity.trusted', 'off', true);
  return v_count;
end;
$$;

-- ===========================================================================
-- Farmácia
-- ===========================================================================
create or replace function public.prescription_payload_for_pharmacy(p_rx public.prescriptions)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'found', true,
    'id', p_rx.id,
    'status', case when p_rx.status = 'issued' and p_rx.valid_until < current_date then 'expired' else p_rx.status::text end,
    'kind', p_rx.kind,
    'issued_at', p_rx.issued_at,
    'valid_until', p_rx.valid_until,
    'general_instructions', p_rx.general_instructions,
    'signature_provider', p_rx.signature_provider,
    'signature_legally_valid', p_rx.signature_legally_valid,
    'integrity_ok', p_rx.content_hash is not null and public.compute_prescription_hash(p_rx.id) = p_rx.content_hash,
    'content_hash', p_rx.content_hash,
    'doctor', (
      select jsonb_build_object('name', pr.full_name, 'crm', d.crm, 'crm_state', d.crm_state, 'specialty', d.specialty)
      from public.doctors d join public.profiles pr on pr.id = d.id where d.id = p_rx.doctor_id
    ),
    'patient', (
      select jsonb_build_object('name', pr.full_name, 'birth_date', pa.birth_date)
      from public.profiles pr left join public.patients pa on pa.id = pr.id where pr.id = p_rx.patient_id
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'medication_name', i.medication_name, 'presentation', i.presentation, 'dosage', i.dosage,
        'route', i.route, 'frequency', i.frequency, 'duration_days', i.duration_days,
        'continuous_use', i.continuous_use, 'quantity', i.quantity, 'instructions', i.instructions
      ) order by i.position, i.id)
      from public.prescription_items i where i.prescription_id = p_rx.id
    ), '[]'::jsonb),
    'dispensations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dispensed_at', ds.dispensed_at, 'pharmacy', ph.trade_name, 'pharmacist_name', ds.pharmacist_name
      ) order by ds.dispensed_at)
      from public.dispensations ds join public.pharmacies ph on ph.id = ds.pharmacy_id
      where ds.prescription_id = p_rx.id
    ), '[]'::jsonb)
  )
$$;

create or replace function public.pharmacy_verify_prescription(p_code text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_pharmacy uuid := public.current_verified_pharmacy();
  v_code text := lower(regexp_replace(coalesce(p_code, ''), '[^0-9a-fA-F]', '', 'g'));
  v_rx public.prescriptions;
  v_name text;
begin
  if v_pharmacy is null then
    raise exception 'Acesso restrito a farmácias verificadas.' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('rxlookup:' || auth.uid()::text, 20, 60);

  if char_length(v_code) <> 32 then
    perform public.write_audit('prescription.lookup_invalid', 'prescription', null, null,
      jsonb_build_object('pharmacy_id', v_pharmacy));
    return jsonb_build_object('found', false);
  end if;

  select * into v_rx from public.prescriptions
   where verification_code = v_code and status not in ('draft', 'pending_signature');
  if not found then
    perform public.write_audit('prescription.lookup_not_found', 'prescription', null, null,
      jsonb_build_object('pharmacy_id', v_pharmacy));
    return jsonb_build_object('found', false);
  end if;

  insert into public.prescription_pharmacy_access (prescription_id, pharmacy_id, accessed_by)
  values (v_rx.id, v_pharmacy, auth.uid());

  perform public.write_audit('prescription.viewed_by_pharmacy', 'prescription', v_rx.id, v_rx.patient_id,
    jsonb_build_object('pharmacy_id', v_pharmacy));

  select trade_name into v_name from public.pharmacies where id = v_pharmacy;
  perform public.notify(v_rx.patient_id, 'prescription', 'Receita consultada por farmácia',
    'A farmácia ' || v_name || ' consultou sua receita.', '/paciente/receitas/' || v_rx.id::text);

  return public.prescription_payload_for_pharmacy(v_rx);
end;
$$;

create or replace function public.pharmacy_dispense(
  p_code text,
  p_pharmacist_name text,
  p_pharmacist_crf text,
  p_notes text default null,
  p_request uuid default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_pharmacy uuid := public.current_verified_pharmacy();
  v_code text := lower(regexp_replace(coalesce(p_code, ''), '[^0-9a-fA-F]', '', 'g'));
  v_rx public.prescriptions;
  v_id uuid;
  v_require_valid boolean;
begin
  if v_pharmacy is null then
    raise exception 'Acesso restrito a farmácias verificadas.' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('rxdispense:' || auth.uid()::text, 20, 60);

  if coalesce(trim(p_pharmacist_name), '') = '' or coalesce(trim(p_pharmacist_crf), '') = '' then
    raise exception 'Informe o farmacêutico responsável e o CRF.' using errcode = '22023';
  end if;

  select * into v_rx from public.prescriptions where verification_code = v_code for update;
  if not found then
    raise exception 'Receita não encontrada.' using errcode = '22023';
  end if;
  if v_rx.status <> 'issued' then
    raise exception 'Esta receita não está apta para dispensação (status: %).', v_rx.status using errcode = '22023';
  end if;
  if v_rx.valid_until < current_date then
    raise exception 'Receita expirada.' using errcode = '22023';
  end if;
  if public.compute_prescription_hash(v_rx.id) <> v_rx.content_hash then
    raise exception 'Falha na verificação de integridade. Não dispense.' using errcode = '22023';
  end if;

  v_require_valid := coalesce(
    (select (value)::text::boolean from public.platform_settings where key = 'dispensation.require_legally_valid_signature'),
    true);
  if v_require_valid and not v_rx.signature_legally_valid then
    raise exception 'A receita não possui assinatura digital com validade jurídica.' using errcode = '22023';
  end if;

  if p_request is not null and not exists (
    select 1 from public.pharmacy_requests r
    where r.id = p_request and r.pharmacy_id = v_pharmacy and r.prescription_id = v_rx.id
  ) then
    raise exception 'Solicitação não corresponde a esta receita.' using errcode = '22023';
  end if;

  insert into public.dispensations (
    prescription_id, pharmacy_id, request_id, registered_by, pharmacist_name, pharmacist_crf, notes, signature_legally_valid
  ) values (
    v_rx.id, v_pharmacy, p_request, auth.uid(), trim(p_pharmacist_name), trim(p_pharmacist_crf),
    nullif(trim(p_notes), ''), v_rx.signature_legally_valid
  ) returning id into v_id;

  perform set_config('genvity.trusted', 'on', true);
  update public.prescriptions set status = 'dispensed', dispensed_at = now() where id = v_rx.id;
  perform set_config('genvity.trusted', 'off', true);

  if p_request is not null then
    update public.pharmacy_requests set status = 'completed' where id = p_request;
    insert into public.pharmacy_request_events (request_id, status, note, actor_id)
    values (p_request, 'completed', 'Dispensação registrada', auth.uid());
  end if;

  perform public.write_audit('prescription.dispensed', 'prescription', v_rx.id, v_rx.patient_id,
    jsonb_build_object('pharmacy_id', v_pharmacy, 'dispensation_id', v_id));
  perform public.notify(v_rx.patient_id, 'prescription', 'Dispensação registrada',
    'Uma farmácia registrou a dispensação da sua receita.', '/paciente/receitas/' || v_rx.id::text);
  return v_id;
end;
$$;

create or replace function public.search_pharmacies(
  p_query text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default 25
)
returns table (
  id uuid,
  trade_name text,
  address_line text,
  district text,
  city text,
  state text,
  phone text,
  opening_hours text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  has_inventory_data boolean,
  matches jsonb
)
language sql stable security definer set search_path = ''
as $$
  with q as (
    select nullif(trim(replace(replace(coalesce(p_query, ''), '%', ''), '_', '')), '') as term
  ),
  base as (
    select
      ph.*,
      case when p_lat is not null and p_lng is not null and ph.latitude is not null and ph.longitude is not null then
        6371 * 2 * asin(sqrt(
          power(sin(radians(ph.latitude - p_lat) / 2), 2)
          + cos(radians(p_lat)) * cos(radians(ph.latitude)) * power(sin(radians(ph.longitude - p_lng) / 2), 2)
        ))
      end as dist
    from public.pharmacies ph
    where ph.verification_status = 'approved' and auth.uid() is not null
  )
  select
    b.id, b.trade_name, b.address_line, b.district, b.city, b.state, b.phone, b.opening_hours,
    b.latitude, b.longitude, round(b.dist::numeric, 2)::double precision,
    exists (select 1 from public.pharmacy_inventory i where i.pharmacy_id = b.id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name, 'presentation', i.presentation,
        'stock_status', i.stock_status, 'updated_at', i.updated_at, 'source', i.source
      ) order by i.stock_status, i.product_name)
      from public.pharmacy_inventory i, q
      where i.pharmacy_id = b.id and q.term is not null and i.product_name ilike '%' || q.term || '%'
    ), '[]'::jsonb)
  from base b
  where b.dist is null or b.dist <= greatest(p_radius_km, 1)
  order by
    (select q.term is not null and not exists (
       select 1 from public.pharmacy_inventory i where i.pharmacy_id = b.id
         and i.product_name ilike '%' || q.term || '%' and i.stock_status <> 'unavailable') from q),
    b.dist nulls last,
    b.trade_name
  limit 50
$$;

create or replace function public.create_pharmacy_request(
  p_pharmacy uuid,
  p_prescription uuid,
  p_items_description text,
  p_note text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.require_role('patient');
  perform public.enforce_rate_limit('pharmreq:' || auth.uid()::text, 10, 3600);

  if not exists (select 1 from public.pharmacies where id = p_pharmacy and verification_status = 'approved') then
    raise exception 'Farmácia indisponível.' using errcode = '22023';
  end if;
  if p_prescription is not null and not exists (
    select 1 from public.prescriptions
    where id = p_prescription and patient_id = auth.uid() and status = 'issued' and valid_until >= current_date
  ) then
    raise exception 'A receita selecionada não está válida para envio.' using errcode = '22023';
  end if;
  if p_prescription is null and coalesce(trim(p_items_description), '') = '' then
    raise exception 'Descreva os produtos ou selecione uma receita.' using errcode = '22023';
  end if;

  insert into public.pharmacy_requests (patient_id, pharmacy_id, prescription_id, items_description, patient_note)
  values (auth.uid(), p_pharmacy, p_prescription, nullif(trim(p_items_description), ''), nullif(trim(p_note), ''))
  returning id into v_id;

  if p_prescription is not null then
    perform public.write_audit('prescription.shared_with_pharmacy', 'prescription', p_prescription, auth.uid(),
      jsonb_build_object('pharmacy_id', p_pharmacy, 'request_id', v_id));
  end if;
  return v_id;
end;
$$;

create or replace function public.pharmacy_update_request(
  p_id uuid,
  p_status public.pharmacy_request_status,
  p_note text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_req public.pharmacy_requests;
begin
  select * into v_req from public.pharmacy_requests where id = p_id for update;
  if not found or not public.is_pharmacy_member(v_req.pharmacy_id) then
    raise exception 'Solicitação não encontrada.' using errcode = '42501';
  end if;
  if v_req.status in ('completed', 'cancelled') then
    raise exception 'Esta solicitação já foi encerrada.' using errcode = '22023';
  end if;

  update public.pharmacy_requests
     set status = p_status, pharmacy_note = coalesce(nullif(trim(p_note), ''), pharmacy_note)
   where id = p_id;
  insert into public.pharmacy_request_events (request_id, status, note, actor_id)
  values (p_id, p_status, nullif(trim(p_note), ''), auth.uid());
end;
$$;

create or replace function public.patient_cancel_pharmacy_request(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.pharmacy_requests set status = 'cancelled'
   where id = p_id and patient_id = auth.uid() and status not in ('completed', 'cancelled');
  if not found then
    raise exception 'Solicitação não encontrada ou já encerrada.' using errcode = '22023';
  end if;
  insert into public.pharmacy_request_events (request_id, status, note, actor_id)
  values (p_id, 'cancelled', 'Cancelada pelo paciente', auth.uid());
end;
$$;

-- ===========================================================================
-- Mensagens
-- ===========================================================================
create or replace function public.start_conversation(p_counterpart uuid, p_subject text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role := public.current_app_role();
  v_doctor uuid;
  v_patient uuid;
  v_id uuid;
begin
  if v_role = 'doctor' then
    v_doctor := auth.uid(); v_patient := p_counterpart;
  elsif v_role = 'patient' then
    v_doctor := p_counterpart; v_patient := auth.uid();
  else
    raise exception 'Operação não permitida.' using errcode = '42501';
  end if;

  if not public.has_care_access(v_doctor, v_patient) then
    raise exception 'O chat só está disponível para vínculos ativos.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.doctors where id = v_doctor and messaging_enabled and verification_status = 'approved') then
    raise exception 'Este profissional não habilitou o chat.' using errcode = '22023';
  end if;

  select id into v_id from public.conversations
   where doctor_id = v_doctor and patient_id = v_patient and appointment_id is null;
  if v_id is null then
    insert into public.conversations (doctor_id, patient_id, subject)
    values (v_doctor, v_patient, coalesce(nullif(trim(p_subject), ''), 'Acompanhamento'))
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.conversations
    where id = p_conversation and (doctor_id = auth.uid() or patient_id = auth.uid())
  ) then
    raise exception 'Conversa não encontrada.' using errcode = '42501';
  end if;
  update public.messages set read_at = now()
   where conversation_id = p_conversation and sender_id <> auth.uid() and read_at is null;
end;
$$;

-- ===========================================================================
-- Planos e assinaturas (sem cobrança real — gateway não integrado)
-- ===========================================================================
create or replace function public.choose_plan(p_slug text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_plan public.plans;
  v_role public.user_role := public.current_app_role();
  v_id uuid;
  v_free boolean;
begin
  select * into v_plan from public.plans where slug = p_slug and is_active;
  if not found then
    raise exception 'Plano não encontrado.' using errcode = '22023';
  end if;
  if not (
    (v_role = 'patient' and v_plan.audience = 'patient')
    or (v_role = 'doctor' and v_plan.audience in ('doctor', 'clinic'))
    or (v_role = 'pharmacy' and v_plan.audience = 'pharmacy')
  ) then
    raise exception 'Este plano não está disponível para o seu tipo de conta.' using errcode = '22023';
  end if;

  v_free := not v_plan.custom_pricing and coalesce(v_plan.price_min_cents, 0) = 0;

  update public.subscriptions set status = 'canceled', canceled_at = now()
   where profile_id = auth.uid() and status in ('pending', 'trialing', 'active', 'past_due');

  insert into public.subscriptions (profile_id, plan_id, status, amount_cents, started_at)
  values (
    auth.uid(), v_plan.id,
    case when v_free then 'active'::public.subscription_status else 'pending'::public.subscription_status end,
    case when v_free then 0 else coalesce(v_plan.price_min_cents, 0) end,
    case when v_free then now() end
  ) returning id into v_id;

  perform public.write_audit('subscription.chosen', 'subscription', v_id, auth.uid(), jsonb_build_object('plan', p_slug));
  return v_id;
end;
$$;

create or replace function public.cancel_my_subscription()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.subscriptions set status = 'canceled', canceled_at = now()
   where profile_id = auth.uid() and status in ('pending', 'trialing', 'active', 'past_due');
  perform public.write_audit('subscription.canceled', 'subscription', null, auth.uid(), '{}'::jsonb);
end;
$$;

-- ===========================================================================
-- Administração
-- ===========================================================================
create or replace function public.assert_admin()
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso restrito à administração.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_metrics()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'users_by_role', coalesce((select jsonb_object_agg(role, n) from (select role, count(*) n from public.profiles group by role) r), '{}'::jsonb),
    'users_total', (select count(*) from public.profiles),
    'doctors_approved', (select count(*) from public.doctors where verification_status = 'approved'),
    'pharmacies_approved', (select count(*) from public.pharmacies where verification_status = 'approved'),
    'pending_verifications', (select count(*) from public.verification_requests where status = 'under_review'),
    'active_subscriptions', (select count(*) from public.subscriptions where status = 'active'),
    'pending_subscriptions', (select count(*) from public.subscriptions where status = 'pending'),
    'mrr_cents', (
      select coalesce(sum(case when pl.billing_interval = 'year' then s.amount_cents / 12 else s.amount_cents end), 0)
      from public.subscriptions s join public.plans pl on pl.id = s.plan_id
      where s.status = 'active'
    ),
    'payments_paid_30d_cents', (select coalesce(sum(amount_cents), 0) from public.payments where status = 'paid' and paid_at > now() - interval '30 days'),
    'prescriptions_issued_30d', (select count(*) from public.prescriptions where issued_at > now() - interval '30 days'),
    'appointments_30d', (select count(*) from public.appointments where created_at > now() - interval '30 days'),
    'dispensations_30d', (select count(*) from public.dispensations where dispensed_at > now() - interval '30 days'),
    'open_tickets', (select count(*) from public.support_tickets where status in ('open', 'in_progress')),
    'open_dsr', (select count(*) from public.data_subject_requests where status in ('open', 'in_progress')),
    'signups_by_week', coalesce((
      select jsonb_agg(jsonb_build_object('week', w, 'count', n) order by w)
      from (
        select date_trunc('week', gs)::date w,
               (select count(*) from public.profiles p where date_trunc('week', p.created_at) = date_trunc('week', gs)) n
        from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') gs
      ) x
    ), '[]'::jsonb),
    'prescriptions_by_week', coalesce((
      select jsonb_agg(jsonb_build_object('week', w, 'count', n) order by w)
      from (
        select date_trunc('week', gs)::date w,
               (select count(*) from public.prescriptions p where date_trunc('week', p.issued_at) = date_trunc('week', gs)) n
        from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') gs
      ) x
    ), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

create or replace function public.admin_log_action(p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  perform public.write_audit('admin.' || p_action, p_entity_type, p_entity_id, null, p_metadata);
end;
$$;

create or replace function public.admin_set_subscription_status(
  p_id uuid,
  p_status public.subscription_status,
  p_amount_cents integer default null,
  p_period_end timestamptz default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.subscriptions set
    status = p_status,
    amount_cents = coalesce(p_amount_cents, amount_cents),
    current_period_end = coalesce(p_period_end, current_period_end),
    started_at = case when p_status = 'active' then coalesce(started_at, now()) else started_at end,
    canceled_at = case when p_status = 'canceled' then now() else canceled_at end
  where id = p_id;
  if not found then
    raise exception 'Assinatura não encontrada.' using errcode = '22023';
  end if;
  perform public.write_audit('admin.subscription_status', 'subscription', p_id, null,
    jsonb_build_object('status', p_status, 'amount_cents', p_amount_cents));
end;
$$;

create or replace function public.admin_record_payment(
  p_subscription uuid,
  p_amount_cents integer,
  p_status public.payment_status,
  p_reference text default null
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.assert_admin();
  if p_amount_cents < 0 then
    raise exception 'Valor inválido.' using errcode = '22023';
  end if;
  insert into public.payments (subscription_id, amount_cents, status, provider, provider_reference, paid_at, recorded_by)
  values (p_subscription, p_amount_cents, p_status, 'manual', nullif(trim(p_reference), ''),
          case when p_status = 'paid' then now() end, auth.uid())
  returning id into v_id;
  perform public.write_audit('admin.payment_recorded', 'payment', v_id, null,
    jsonb_build_object('subscription_id', p_subscription, 'amount_cents', p_amount_cents, 'status', p_status));
  return v_id;
end;
$$;

create or replace function public.admin_update_plan(
  p_id uuid,
  p_price_min_cents integer,
  p_price_max_cents integer,
  p_is_active boolean,
  p_description text
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  if p_price_max_cents is not null and p_price_min_cents is not null and p_price_max_cents < p_price_min_cents then
    raise exception 'O preço máximo deve ser maior ou igual ao mínimo.' using errcode = '22023';
  end if;
  update public.plans set
    price_min_cents = p_price_min_cents, price_max_cents = p_price_max_cents,
    is_active = p_is_active, description = coalesce(p_description, description)
  where id = p_id;
  perform public.write_audit('admin.plan_updated', 'plan', p_id, null,
    jsonb_build_object('price_min_cents', p_price_min_cents, 'price_max_cents', p_price_max_cents, 'is_active', p_is_active));
end;
$$;

create or replace function public.admin_respond_ticket(p_id uuid, p_status public.ticket_status, p_response text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_requester uuid;
begin
  perform public.assert_admin();
  update public.support_tickets set
    status = p_status,
    admin_response = coalesce(nullif(trim(p_response), ''), admin_response),
    responded_by = auth.uid()
  where id = p_id
  returning requester_id into v_requester;
  if v_requester is null then
    raise exception 'Chamado não encontrado.' using errcode = '22023';
  end if;
  perform public.notify(v_requester, 'support', 'Atualização do seu chamado',
    'A equipe Genvity respondeu ao seu chamado.', '/ajuda?tab=chamados');
  perform public.write_audit('admin.ticket_updated', 'support_ticket', p_id, v_requester, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_resolve_dsr(p_id uuid, p_status public.dsr_status, p_notes text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
begin
  perform public.assert_admin();
  update public.data_subject_requests set
    status = p_status, resolution_notes = nullif(trim(p_notes), ''), resolved_by = auth.uid(),
    resolved_at = case when p_status in ('completed', 'rejected') then now() end
  where id = p_id
  returning user_id into v_user;
  if v_user is null then
    raise exception 'Solicitação não encontrada.' using errcode = '22023';
  end if;
  perform public.notify(v_user, 'privacy', 'Solicitação de privacidade atualizada',
    'Sua solicitação sobre dados pessoais foi atualizada.', '/conta?tab=privacidade');
  perform public.write_audit('admin.dsr_updated', 'data_subject_request', p_id, v_user, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_update_setting(p_key text, p_value jsonb)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.platform_settings set value = p_value, updated_by = auth.uid() where key = p_key;
  if not found then
    raise exception 'Configuração não encontrada.' using errcode = '22023';
  end if;
  perform public.write_audit('admin.setting_updated', 'platform_setting', null, null,
    jsonb_build_object('key', p_key, 'value', p_value));
end;
$$;

-- ===========================================================================
-- LGPD — exportação dos dados do titular
-- ===========================================================================
create or replace function public.export_my_data()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v jsonb;
begin
  if v_uid is null then
    raise exception 'Sessão expirada.' using errcode = '42501';
  end if;
  perform public.enforce_rate_limit('export:' || v_uid::text, 5, 3600);

  select jsonb_build_object(
    'generated_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'patient', (select to_jsonb(x) from public.patients x where x.id = v_uid),
    'doctor', (select to_jsonb(x) from public.doctors x where x.id = v_uid),
    'allergies', coalesce((select jsonb_agg(to_jsonb(x)) from public.allergies x where x.patient_id = v_uid), '[]'),
    'care_relationships', coalesce((select jsonb_agg(to_jsonb(x)) from public.care_relationships x where x.patient_id = v_uid or x.doctor_id = v_uid), '[]'),
    'appointments', coalesce((select jsonb_agg(to_jsonb(x)) from public.appointments x where x.patient_id = v_uid or x.doctor_id = v_uid), '[]'),
    'consultations', coalesce((select jsonb_agg(to_jsonb(x)) from public.consultations x where x.patient_id = v_uid or x.doctor_id = v_uid), '[]'),
    'shared_clinical_notes', coalesce((select jsonb_agg(to_jsonb(x)) from public.clinical_notes x where (x.patient_id = v_uid and x.shared_with_patient) or x.doctor_id = v_uid), '[]'),
    'prescriptions', coalesce((
      select jsonb_agg(to_jsonb(x) - 'verification_code' || jsonb_build_object('items',
        (select coalesce(jsonb_agg(to_jsonb(i)), '[]') from public.prescription_items i where i.prescription_id = x.id)))
      from public.prescriptions x
      where (x.patient_id = v_uid and x.status not in ('draft', 'pending_signature')) or x.doctor_id = v_uid
    ), '[]'),
    'medications', coalesce((select jsonb_agg(to_jsonb(x)) from public.patient_medications x where x.patient_id = v_uid), '[]'),
    'dose_logs', coalesce((select jsonb_agg(to_jsonb(x)) from public.dose_logs x where x.patient_id = v_uid), '[]'),
    'reminders', coalesce((select jsonb_agg(to_jsonb(x)) from public.reminders x where x.patient_id = v_uid), '[]'),
    'documents', coalesce((select jsonb_agg(to_jsonb(x)) from public.documents x where x.patient_id = v_uid or x.uploaded_by = v_uid), '[]'),
    'messages', coalesce((
      select jsonb_agg(to_jsonb(m)) from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where c.patient_id = v_uid or c.doctor_id = v_uid
    ), '[]'),
    'pharmacy_requests', coalesce((select jsonb_agg(to_jsonb(x)) from public.pharmacy_requests x where x.patient_id = v_uid), '[]'),
    'subscriptions', coalesce((select jsonb_agg(to_jsonb(x)) from public.subscriptions x where x.profile_id = v_uid), '[]'),
    'support_tickets', coalesce((select jsonb_agg(to_jsonb(x)) from public.support_tickets x where x.requester_id = v_uid), '[]'),
    'privacy_requests', coalesce((select jsonb_agg(to_jsonb(x)) from public.data_subject_requests x where x.user_id = v_uid), '[]'),
    'access_log', coalesce((
      select jsonb_agg(jsonb_build_object('action', a.action, 'entity_type', a.entity_type, 'actor_role', a.actor_role, 'created_at', a.created_at) order by a.created_at)
      from public.audit_logs a where a.subject_user_id = v_uid
    ), '[]')
  ) into v;

  perform public.write_audit('privacy.export', 'profile', v_uid, v_uid, '{}'::jsonb);
  return v;
end;
$$;

-- ===========================================================================
-- Permissões de execução
-- ===========================================================================
revoke execute on all functions in schema public from public, anon, authenticated;

-- Auxiliares usados em políticas RLS
grant execute on function
  public.current_app_role(),
  public.is_admin(),
  public.is_verified_doctor(uuid),
  public.has_care_access(uuid, uuid),
  public.has_history_access(uuid, uuid),
  public.has_documents_access(uuid, uuid),
  public.is_pharmacy_member(uuid),
  public.is_pharmacy_owner(uuid),
  public.current_verified_pharmacy(),
  public.can_view_profile(uuid),
  public.can_view_prescription(uuid)
to authenticated;
grant execute on function public.is_admin() to anon;

-- RPCs de aplicação
grant execute on function
  public.complete_patient_onboarding(text, date, text, text, text, text, text),
  public.complete_doctor_onboarding(text, text, text, text, text, text, text, public.appointment_modality[], text, text[]),
  public.complete_pharmacy_onboarding(text, text, text, text, text, text, text, text, text, text, text, text, text, double precision, double precision, text, text[]),
  public.admin_review_verification(uuid, boolean, text),
  public.get_available_slots(uuid, date, integer),
  public.search_doctors(text, text, text, public.appointment_modality, boolean),
  public.request_appointment(uuid, timestamptz, public.appointment_modality, text, boolean, boolean),
  public.doctor_update_appointment(uuid, text, text),
  public.patient_cancel_appointment(uuid, text),
  public.reschedule_appointment(uuid, timestamptz),
  public.doctor_schedule_appointment(uuid, timestamptz, integer, public.appointment_modality, text),
  public.invite_patient(text),
  public.respond_invitation(uuid, boolean, boolean, boolean),
  public.update_care_consent(uuid, boolean, boolean),
  public.revoke_care(uuid),
  public.log_patient_record_access(uuid),
  public.submit_prescription(uuid),
  public.return_prescription_to_draft(uuid),
  public.cancel_prescription(uuid, text),
  public.pharmacy_verify_prescription(text),
  public.pharmacy_dispense(text, text, text, text, uuid),
  public.search_pharmacies(text, double precision, double precision, double precision),
  public.create_pharmacy_request(uuid, uuid, text, text),
  public.pharmacy_update_request(uuid, public.pharmacy_request_status, text),
  public.patient_cancel_pharmacy_request(uuid),
  public.start_conversation(uuid, text),
  public.mark_conversation_read(uuid),
  public.choose_plan(text),
  public.cancel_my_subscription(),
  public.admin_metrics(),
  public.admin_log_action(text, text, uuid, jsonb),
  public.admin_set_subscription_status(uuid, public.subscription_status, integer, timestamptz),
  public.admin_record_payment(uuid, integer, public.payment_status, text),
  public.admin_update_plan(uuid, integer, integer, boolean, text),
  public.admin_respond_ticket(uuid, public.ticket_status, text),
  public.admin_resolve_dsr(uuid, public.dsr_status, text),
  public.admin_update_setting(text, jsonb),
  public.export_my_data()
to authenticated;

-- Somente o servidor (service_role) finaliza emissões e expira receitas.
grant execute on function
  public.finalize_prescription_issue(uuid, uuid, text, text, text, boolean),
  public.expire_prescriptions(),
  public.compute_prescription_hash(uuid)
to service_role;

-- Novas funções não ficam executáveis por padrão para clientes.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
