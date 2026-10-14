-- Genvity :: 0500 — funções auxiliares de autorização, auditoria e gatilhos
-- Todas as funções SECURITY DEFINER usam search_path vazio e nomes qualificados.

-- ---------------------------------------------------------------------------
-- Autorização
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select p.role = 'admin' from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function public.is_verified_doctor(p_doctor uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.doctors d
    where d.id = p_doctor and d.verification_status = 'approved'
  )
$$;

create or replace function public.has_care_access(p_doctor uuid, p_patient uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.care_relationships c
    where c.doctor_id = p_doctor and c.patient_id = p_patient and c.status = 'active'
  )
$$;

create or replace function public.has_history_access(p_doctor uuid, p_patient uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.care_relationships c
    where c.doctor_id = p_doctor and c.patient_id = p_patient
      and c.status = 'active' and c.share_history
  )
$$;

create or replace function public.has_documents_access(p_doctor uuid, p_patient uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.care_relationships c
    where c.doctor_id = p_doctor and c.patient_id = p_patient
      and c.status = 'active' and c.share_documents
  )
$$;

create or replace function public.is_pharmacy_member(p_pharmacy uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.pharmacy_members m
    where m.pharmacy_id = p_pharmacy and m.profile_id = auth.uid()
  )
$$;

create or replace function public.is_pharmacy_owner(p_pharmacy uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.pharmacy_members m
    where m.pharmacy_id = p_pharmacy and m.profile_id = auth.uid() and m.member_role = 'owner'
  )
$$;

-- Farmácia (aprovada) do usuário atual, ou null.
create or replace function public.current_verified_pharmacy()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.pharmacy_id
  from public.pharmacy_members m
  join public.pharmacies ph on ph.id = m.pharmacy_id
  where m.profile_id = auth.uid() and ph.verification_status = 'approved'
  order by m.created_at
  limit 1
$$;

-- Quem pode ver nome/avatar de um perfil.
create or replace function public.can_view_profile(p_target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    p_target = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.doctors d where d.id = p_target and d.verification_status = 'approved')
    or exists (
      select 1 from public.care_relationships c
      where (c.doctor_id = auth.uid() and c.patient_id = p_target)
         or (c.patient_id = auth.uid() and c.doctor_id = p_target)
    )
    or exists (
      select 1 from public.pharmacy_requests r
      join public.pharmacy_members m on m.pharmacy_id = r.pharmacy_id and m.profile_id = auth.uid()
      where r.patient_id = p_target
    )
    or exists (
      select 1 from public.pharmacy_members m
      where m.profile_id = p_target and public.is_pharmacy_member(m.pharmacy_id)
    )
$$;

create or replace function public.can_view_prescription(p_prescription uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.prescriptions p
    where p.id = p_prescription
      and (
        p.doctor_id = auth.uid()
        or (p.patient_id = auth.uid() and p.status not in ('draft', 'pending_signature'))
        or (
          p.status not in ('draft', 'pending_signature')
          and public.has_history_access(auth.uid(), p.patient_id)
        )
        or exists (
          select 1 from public.pharmacy_requests r
          where r.prescription_id = p.id
            and r.pharmacy_id = public.current_verified_pharmacy()
        )
      )
  )
$$;

-- ---------------------------------------------------------------------------
-- Auditoria e notificações
-- ---------------------------------------------------------------------------
create or replace function public.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_subject uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, subject_user_id, metadata)
  values (
    auth.uid(),
    (select role from public.profiles where id = auth.uid()),
    p_action, p_entity_type, p_entity_id, p_subject, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.notify(
  p_user uuid,
  p_kind text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_user is null then
    return;
  end if;
  insert into public.notifications (user_id, kind, title, body, link)
  values (p_user, p_kind, p_title, p_body, p_link);
end;
$$;

-- Limite por janela fixa. Retorna false quando o limite foi excedido.
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits as rl (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = rl.hits + 1
  returning hits into v_hits;

  -- Limpeza oportunista de janelas antigas.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;

create or replace function public.enforce_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.check_rate_limit(p_key, p_max, p_window_seconds) then
    raise exception 'Muitas solicitações em pouco tempo. Aguarde e tente novamente.'
      using errcode = 'P0429';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gatilhos utilitários
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'patients', 'doctors', 'pharmacies', 'appointments', 'consultations',
    'clinical_notes', 'prescriptions', 'patient_medications', 'pharmacy_inventory',
    'pharmacy_requests', 'subscriptions', 'support_tickets', 'plans', 'platform_settings'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t || '_touch_updated_at', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Criação automática de perfil ao cadastrar no Supabase Auth.
-- O papel vem do metadata, mas nunca pode ser 'admin'.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role;
  v_requested text := new.raw_user_meta_data ->> 'role';
begin
  v_role := case
    when v_requested in ('patient', 'doctor', 'pharmacy') then v_requested::public.user_role
    else 'patient'::public.user_role
  end;

  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    v_role,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''), 160)
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Proteção de colunas sensíveis de perfis e cadastros
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and coalesce(current_setting('genvity.trusted', true), '') <> 'on'
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'O papel da conta não pode ser alterado por este canal.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_verification_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('genvity.trusted', true), '') <> 'on'
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    if new.verification_status is distinct from old.verification_status
       or new.verified_at is distinct from old.verified_at then
      raise exception 'O status de verificação só pode ser alterado pela equipe Genvity.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger doctors_guard_verification before update on public.doctors
  for each row execute function public.guard_verification_columns();
create trigger pharmacies_guard_verification before update on public.pharmacies
  for each row execute function public.guard_verification_columns();

-- ---------------------------------------------------------------------------
-- Imutabilidade de prescrições
-- Após sair de rascunho, apenas funções confiáveis (que ativam
-- `genvity.trusted`) podem alterar a prescrição — e somente o status.
-- ---------------------------------------------------------------------------
create or replace function public.guard_prescription_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_trusted boolean := coalesce(current_setting('genvity.trusted', true), '') = 'on';
begin
  if new.doctor_id is distinct from old.doctor_id or new.patient_id is distinct from old.patient_id then
    raise exception 'Médico e paciente de uma prescrição não podem ser alterados.' using errcode = '42501';
  end if;

  if not v_trusted then
    if old.status <> 'draft' then
      raise exception 'Prescrições fora de rascunho não podem ser editadas diretamente.' using errcode = '42501';
    end if;
    if new.status is distinct from old.status
       or new.issued_at is distinct from old.issued_at
       or new.signed_at is distinct from old.signed_at
       or new.signature_provider is distinct from old.signature_provider
       or new.signature_reference is distinct from old.signature_reference
       or new.signature_legally_valid is distinct from old.signature_legally_valid
       or new.content_hash is distinct from old.content_hash
       or new.verification_code is distinct from old.verification_code
       or new.submitted_at is distinct from old.submitted_at
       or new.dispensed_at is distinct from old.dispensed_at
       or new.cancelled_at is distinct from old.cancelled_at then
      raise exception 'Mudanças de status exigem o fluxo de emissão.' using errcode = '42501';
    end if;
  else
    -- Mesmo em fluxo confiável, conteúdo clínico emitido é imutável.
    if old.status in ('issued', 'dispensed', 'cancelled', 'expired') and (
      new.kind is distinct from old.kind
      or new.general_instructions is distinct from old.general_instructions
      or new.valid_until is distinct from old.valid_until
      or new.content_hash is distinct from old.content_hash
      or new.verification_code is distinct from old.verification_code
      or new.issued_at is distinct from old.issued_at
    ) then
      raise exception 'O conteúdo de uma prescrição emitida é imutável.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger prescriptions_guard before update on public.prescriptions
  for each row execute function public.guard_prescription_update();

create or replace function public.guard_prescription_items()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.prescription_status;
begin
  select status into v_status from public.prescriptions
  where id = coalesce(new.prescription_id, old.prescription_id);

  -- Parent ausente = exclusão em cascata de um rascunho (já validada na própria prescrição).
  if v_status is not null and v_status <> 'draft' then
    raise exception 'Itens só podem ser alterados enquanto a prescrição é rascunho.' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.prescription_id <> old.prescription_id then
    raise exception 'Item não pode mudar de prescrição.' using errcode = '42501';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger prescription_items_guard before insert or update or delete on public.prescription_items
  for each row execute function public.guard_prescription_items();

-- O paciente ajusta lembretes e status, mas não o conteúdo prescrito.
create or replace function public.guard_patient_medication_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.source = 'prescription' and coalesce(current_setting('genvity.trusted', true), '') <> 'on' then
    if new.name is distinct from old.name
       or new.presentation is distinct from old.presentation
       or new.dosage is distinct from old.dosage
       or new.frequency is distinct from old.frequency
       or new.instructions is distinct from old.instructions
       or new.start_date is distinct from old.start_date
       or new.end_date is distinct from old.end_date
       or new.source is distinct from old.source
       or new.prescription_id is distinct from old.prescription_id
       or new.prescription_item_id is distinct from old.prescription_item_id then
      raise exception 'Medicamentos prescritos não podem ter dose, frequência ou período alterados pelo paciente.' using errcode = '42501';
    end if;
  end if;
  if new.patient_id is distinct from old.patient_id then
    raise exception 'Operação não permitida.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger patient_medications_guard before update on public.patient_medications
  for each row execute function public.guard_patient_medication_update();

-- ---------------------------------------------------------------------------
-- Mensagens: atualiza conversa, limita envio e notifica destinatário
-- ---------------------------------------------------------------------------
create or replace function public.on_message_inserted()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_conv public.conversations;
  v_recipient uuid;
  v_link text;
begin
  perform public.enforce_rate_limit('msg:' || new.sender_id::text, 30, 60);

  select * into v_conv from public.conversations where id = new.conversation_id;
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;

  if new.sender_id = v_conv.doctor_id then
    v_recipient := v_conv.patient_id;
    v_link := '/paciente/mensagens?c=' || v_conv.id::text;
  else
    v_recipient := v_conv.doctor_id;
    v_link := '/medico/mensagens?c=' || v_conv.id::text;
  end if;

  perform public.notify(v_recipient, 'message', 'Nova mensagem', 'Você recebeu uma nova mensagem segura.', v_link);
  return new;
end;
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_inserted();

-- ---------------------------------------------------------------------------
-- Auditoria automática de entidades sensíveis
-- ---------------------------------------------------------------------------
create or replace function public.audit_prescription_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit('prescription.created', 'prescription', new.id, new.patient_id,
      jsonb_build_object('kind', new.kind));
  elsif new.status is distinct from old.status then
    perform public.write_audit('prescription.status_changed', 'prescription', new.id, new.patient_id,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

create trigger prescriptions_audit after insert or update on public.prescriptions
  for each row execute function public.audit_prescription_change();

create or replace function public.audit_care_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit('care.created', 'care_relationship', new.id, new.patient_id,
      jsonb_build_object('doctor_id', new.doctor_id, 'status', new.status,
        'share_history', new.share_history, 'share_documents', new.share_documents));
  elsif new.status is distinct from old.status
     or new.share_history is distinct from old.share_history
     or new.share_documents is distinct from old.share_documents then
    perform public.write_audit('care.updated', 'care_relationship', new.id, new.patient_id,
      jsonb_build_object('doctor_id', new.doctor_id, 'status', new.status,
        'share_history', new.share_history, 'share_documents', new.share_documents));
  end if;
  return new;
end;
$$;

create trigger care_relationships_audit after insert or update on public.care_relationships
  for each row execute function public.audit_care_change();

create or replace function public.audit_document_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit('document.uploaded', 'document', new.id, new.patient_id,
      jsonb_build_object('kind', new.kind));
    return new;
  else
    perform public.write_audit('document.deleted', 'document', old.id, old.patient_id,
      jsonb_build_object('kind', old.kind));
    return old;
  end if;
end;
$$;

create trigger documents_audit after insert or delete on public.documents
  for each row execute function public.audit_document_change();

-- ---------------------------------------------------------------------------
-- Notificações de consultas
-- ---------------------------------------------------------------------------
create or replace function public.on_appointment_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_when text;
begin
  v_when := to_char(new.starts_at at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI');

  if tg_op = 'INSERT' then
    if new.status = 'requested' then
      perform public.notify(new.doctor_id, 'appointment', 'Nova solicitação de consulta',
        'Solicitação para ' || v_when || '.', '/medico/agenda');
    elsif new.status = 'confirmed' and new.created_by = new.doctor_id then
      perform public.notify(new.patient_id, 'appointment', 'Consulta agendada',
        'Seu médico agendou uma consulta para ' || v_when || '.', '/paciente/calendario');
    end if;
  elsif new.status is distinct from old.status then
    perform public.write_audit('appointment.status_changed', 'appointment', new.id, new.patient_id,
      jsonb_build_object('from', old.status, 'to', new.status));
    if new.status = 'confirmed' then
      perform public.notify(new.patient_id, 'appointment', 'Consulta confirmada',
        'Sua consulta de ' || v_when || ' foi confirmada.', '/paciente/calendario');
    elsif new.status = 'cancelled' then
      if new.cancelled_by = new.patient_id then
        perform public.notify(new.doctor_id, 'appointment', 'Consulta cancelada pelo paciente',
          'A consulta de ' || v_when || ' foi cancelada.', '/medico/agenda');
      else
        perform public.notify(new.patient_id, 'appointment', 'Consulta cancelada',
          'A consulta de ' || v_when || ' foi cancelada.', '/paciente/calendario');
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger appointments_after_change after insert or update on public.appointments
  for each row execute function public.on_appointment_change();

-- ---------------------------------------------------------------------------
-- Solicitações de farmácia
-- ---------------------------------------------------------------------------
create or replace function public.on_pharmacy_request_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_member record;
  v_labels jsonb := jsonb_build_object(
    'received', 'recebida', 'reviewing', 'em conferência', 'awaiting_stock', 'aguardando estoque',
    'preparing', 'em separação', 'ready', 'pronta para retirada', 'completed', 'concluída',
    'cancelled', 'cancelada');
begin
  if tg_op = 'INSERT' then
    insert into public.pharmacy_request_events (request_id, status, note, actor_id)
    values (new.id, new.status, 'Solicitação criada', auth.uid());
    for v_member in select profile_id from public.pharmacy_members where pharmacy_id = new.pharmacy_id loop
      perform public.notify(v_member.profile_id, 'pharmacy_request', 'Nova solicitação recebida',
        'Um paciente enviou uma solicitação.', '/farmacia/solicitacoes');
    end loop;
  elsif new.status is distinct from old.status then
    perform public.notify(new.patient_id, 'pharmacy_request', 'Atualização da sua solicitação',
      'Sua solicitação está ' || (v_labels ->> new.status::text) || '.', '/paciente/farmacias?tab=solicitacoes');
  end if;
  return new;
end;
$$;

create trigger pharmacy_requests_after_change after insert or update on public.pharmacy_requests
  for each row execute function public.on_pharmacy_request_change();
