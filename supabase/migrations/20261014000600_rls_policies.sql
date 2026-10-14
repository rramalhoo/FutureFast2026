-- Genvity :: 0600 — Row Level Security
-- Princípio: negar por padrão. Toda tabela tem RLS habilitado; mudanças de
-- estado sensíveis acontecem por funções (0700), não por UPDATE direto.

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'patients', 'allergies', 'doctors', 'pharmacies', 'pharmacy_members',
    'clinics', 'clinic_members', 'verification_requests', 'care_relationships',
    'care_invitations', 'doctor_availability', 'schedule_blocks', 'appointments',
    'consultations', 'clinical_notes', 'medications', 'prescriptions', 'prescription_items',
    'patient_medications', 'dose_logs', 'reminders', 'documents', 'conversations', 'messages',
    'doctor_tasks', 'pharmacy_inventory', 'pharmacy_requests', 'pharmacy_request_events',
    'prescription_pharmacy_access', 'dispensations', 'plans', 'subscriptions', 'payments',
    'support_tickets', 'notifications', 'audit_logs', 'platform_settings',
    'data_subject_requests', 'favorites', 'rate_limits'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Usuários anônimos não acessam dados (exceto planos e configurações públicas).
revoke all on all tables in schema public from anon;
grant select on public.plans, public.platform_settings to anon;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_view_profile(id));

revoke update on public.profiles from authenticated;
grant update (full_name, avatar_path, preferences) on public.profiles to authenticated;

create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- patients / allergies
-- ---------------------------------------------------------------------------
create policy patients_select on public.patients for select to authenticated
  using (id = auth.uid() or public.has_care_access(auth.uid(), id));

create policy patients_update_self on public.patients for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy allergies_select on public.allergies for select to authenticated
  using (patient_id = auth.uid() or public.has_care_access(auth.uid(), patient_id));

create policy allergies_insert on public.allergies for insert to authenticated
  with check (
    recorded_by = auth.uid()
    and (
      patient_id = auth.uid()
      or (public.is_verified_doctor() and public.has_care_access(auth.uid(), patient_id))
    )
  );

create policy allergies_delete on public.allergies for delete to authenticated
  using (patient_id = auth.uid() or recorded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- doctors
-- ---------------------------------------------------------------------------
create policy doctors_select on public.doctors for select to authenticated
  using (
    id = auth.uid()
    or verification_status = 'approved'
    or public.is_admin()
    or exists (select 1 from public.care_relationships c where c.doctor_id = doctors.id and c.patient_id = auth.uid())
  );

revoke update on public.doctors from authenticated;
grant update (specialty, rqe, bio, city, state, modalities, accepting_new_patients, messaging_enabled)
  on public.doctors to authenticated;

create policy doctors_update_self on public.doctors for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- pharmacies / members
-- ---------------------------------------------------------------------------
create policy pharmacies_select on public.pharmacies for select to authenticated
  using (verification_status = 'approved' or public.is_pharmacy_member(id) or public.is_admin());

revoke update on public.pharmacies from authenticated;
grant update (trade_name, phone, address_line, district, city, state, postal_code, latitude, longitude, opening_hours)
  on public.pharmacies to authenticated;

create policy pharmacies_update_owner on public.pharmacies for update to authenticated
  using (public.is_pharmacy_owner(id)) with check (public.is_pharmacy_owner(id));

create policy pharmacy_members_select on public.pharmacy_members for select to authenticated
  using (profile_id = auth.uid() or public.is_pharmacy_member(pharmacy_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- clinics
-- ---------------------------------------------------------------------------
create policy clinics_select on public.clinics for select to authenticated
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.clinic_members m where m.clinic_id = clinics.id and m.doctor_id = auth.uid())
  );

create policy clinics_insert on public.clinics for insert to authenticated
  with check (owner_id = auth.uid() and public.is_verified_doctor());

create policy clinics_update on public.clinics for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy clinic_members_select on public.clinic_members for select to authenticated
  using (
    doctor_id = auth.uid()
    or exists (select 1 from public.clinics c where c.id = clinic_members.clinic_id and c.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- verification_requests (mudanças via RPC)
-- ---------------------------------------------------------------------------
create policy verification_requests_select on public.verification_requests for select to authenticated
  using (submitted_by = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- care relationships / invitations (mudanças via RPC)
-- ---------------------------------------------------------------------------
create policy care_select on public.care_relationships for select to authenticated
  using (doctor_id = auth.uid() or patient_id = auth.uid());

create policy invitations_select on public.care_invitations for select to authenticated
  using (
    doctor_id = auth.uid()
    or (email = (auth.jwt() ->> 'email') and status = 'pending' and expires_at > now())
  );

-- ---------------------------------------------------------------------------
-- agenda
-- ---------------------------------------------------------------------------
create policy availability_select on public.doctor_availability for select to authenticated
  using (doctor_id = auth.uid() or public.is_verified_doctor(doctor_id));

create policy availability_insert on public.doctor_availability for insert to authenticated
  with check (doctor_id = auth.uid());
create policy availability_update on public.doctor_availability for update to authenticated
  using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());
create policy availability_delete on public.doctor_availability for delete to authenticated
  using (doctor_id = auth.uid());

create policy blocks_select on public.schedule_blocks for select to authenticated
  using (doctor_id = auth.uid());
create policy blocks_insert on public.schedule_blocks for insert to authenticated
  with check (doctor_id = auth.uid());
create policy blocks_delete on public.schedule_blocks for delete to authenticated
  using (doctor_id = auth.uid());

create policy appointments_select on public.appointments for select to authenticated
  using (doctor_id = auth.uid() or patient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- consultations / clinical notes
-- ---------------------------------------------------------------------------
create policy consultations_select on public.consultations for select to authenticated
  using (
    doctor_id = auth.uid()
    or patient_id = auth.uid()
    or public.has_history_access(auth.uid(), patient_id)
  );

create policy consultations_insert on public.consultations for insert to authenticated
  with check (
    doctor_id = auth.uid()
    and public.is_verified_doctor()
    and public.has_care_access(auth.uid(), patient_id)
  );

create policy consultations_update on public.consultations for update to authenticated
  using (doctor_id = auth.uid()) with check (doctor_id = auth.uid() and public.has_care_access(auth.uid(), patient_id));

create policy clinical_notes_select on public.clinical_notes for select to authenticated
  using (doctor_id = auth.uid() or (patient_id = auth.uid() and shared_with_patient));

create policy clinical_notes_insert on public.clinical_notes for insert to authenticated
  with check (
    doctor_id = auth.uid()
    and public.is_verified_doctor()
    and public.has_care_access(auth.uid(), patient_id)
  );

create policy clinical_notes_update on public.clinical_notes for update to authenticated
  using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- medications catalog
-- ---------------------------------------------------------------------------
create policy medications_select on public.medications for select to authenticated using (true);
create policy medications_admin_insert on public.medications for insert to authenticated with check (public.is_admin());
create policy medications_admin_update on public.medications for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- prescriptions / items
-- ---------------------------------------------------------------------------
-- Avalia a própria linha (e não uma função sobre a tabela) para que
-- INSERT ... RETURNING funcione no mesmo comando.
create policy prescriptions_select on public.prescriptions for select to authenticated
  using (
    doctor_id = auth.uid()
    or (patient_id = auth.uid() and status not in ('draft', 'pending_signature'))
    or (status not in ('draft', 'pending_signature') and public.has_history_access(auth.uid(), patient_id))
    or exists (
      select 1 from public.pharmacy_requests r
      where r.prescription_id = prescriptions.id
        and r.pharmacy_id = public.current_verified_pharmacy()
    )
  );

create policy prescriptions_insert on public.prescriptions for insert to authenticated
  with check (
    doctor_id = auth.uid()
    and status = 'draft'
    and public.is_verified_doctor()
    and public.has_care_access(auth.uid(), patient_id)
  );

create policy prescriptions_update_draft on public.prescriptions for update to authenticated
  using (doctor_id = auth.uid() and status = 'draft')
  with check (doctor_id = auth.uid() and status = 'draft');

create policy prescriptions_delete_draft on public.prescriptions for delete to authenticated
  using (doctor_id = auth.uid() and status = 'draft');

create policy prescription_items_select on public.prescription_items for select to authenticated
  using (public.can_view_prescription(prescription_id));

create policy prescription_items_write on public.prescription_items for insert to authenticated
  with check (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and p.doctor_id = auth.uid() and p.status = 'draft'
  ));

create policy prescription_items_update on public.prescription_items for update to authenticated
  using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and p.doctor_id = auth.uid() and p.status = 'draft'
  ));

create policy prescription_items_delete on public.prescription_items for delete to authenticated
  using (exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and p.doctor_id = auth.uid() and p.status = 'draft'
  ));

-- ---------------------------------------------------------------------------
-- acompanhamento do paciente
-- ---------------------------------------------------------------------------
create policy patient_medications_select on public.patient_medications for select to authenticated
  using (patient_id = auth.uid() or public.has_history_access(auth.uid(), patient_id));

create policy patient_medications_insert on public.patient_medications for insert to authenticated
  with check (patient_id = auth.uid() and source = 'personal' and prescription_id is null and prescription_item_id is null);

create policy patient_medications_update on public.patient_medications for update to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy patient_medications_delete on public.patient_medications for delete to authenticated
  using (patient_id = auth.uid() and source = 'personal');

create policy dose_logs_select on public.dose_logs for select to authenticated
  using (patient_id = auth.uid() or public.has_history_access(auth.uid(), patient_id));

create policy dose_logs_insert on public.dose_logs for insert to authenticated
  with check (
    patient_id = auth.uid()
    and exists (select 1 from public.patient_medications m where m.id = patient_medication_id and m.patient_id = auth.uid())
  );

create policy dose_logs_update on public.dose_logs for update to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());

create policy dose_logs_delete on public.dose_logs for delete to authenticated
  using (patient_id = auth.uid());

create policy reminders_all on public.reminders for all to authenticated
  using (patient_id = auth.uid()) with check (patient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- documentos
-- ---------------------------------------------------------------------------
create policy documents_select on public.documents for select to authenticated
  using (
    patient_id = auth.uid()
    or uploaded_by = auth.uid()
    or public.has_documents_access(auth.uid(), patient_id)
  );

create policy documents_insert on public.documents for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      patient_id = auth.uid()
      or (public.is_verified_doctor() and public.has_care_access(auth.uid(), patient_id))
    )
    and split_part(storage_path, '/', 1) = patient_id::text
  );

create policy documents_delete on public.documents for delete to authenticated
  using (uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- mensagens
-- ---------------------------------------------------------------------------
create policy conversations_select on public.conversations for select to authenticated
  using (doctor_id = auth.uid() or patient_id = auth.uid());

create policy messages_select on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.doctor_id = auth.uid() or c.patient_id = auth.uid())
  ));

create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and read_at is null
    and exists (
      select 1 from public.conversations c
      join public.doctors d on d.id = c.doctor_id
      where c.id = conversation_id
        and (c.doctor_id = auth.uid() or c.patient_id = auth.uid())
        and d.messaging_enabled
        and public.has_care_access(c.doctor_id, c.patient_id)
    )
    and (
      document_id is null
      or exists (
        select 1 from public.documents doc
        join public.conversations c2 on c2.id = conversation_id
        where doc.id = document_id and doc.patient_id = c2.patient_id
          and (doc.uploaded_by = auth.uid() or doc.patient_id = auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- tarefas do médico
-- ---------------------------------------------------------------------------
create policy doctor_tasks_all on public.doctor_tasks for all to authenticated
  using (doctor_id = auth.uid())
  with check (
    doctor_id = auth.uid()
    and (patient_id is null or public.has_care_access(auth.uid(), patient_id))
  );

-- ---------------------------------------------------------------------------
-- farmácia
-- ---------------------------------------------------------------------------
create policy inventory_select on public.pharmacy_inventory for select to authenticated
  using (public.is_pharmacy_member(pharmacy_id));
create policy inventory_insert on public.pharmacy_inventory for insert to authenticated
  with check (public.is_pharmacy_member(pharmacy_id));
create policy inventory_update on public.pharmacy_inventory for update to authenticated
  using (public.is_pharmacy_member(pharmacy_id)) with check (public.is_pharmacy_member(pharmacy_id));
create policy inventory_delete on public.pharmacy_inventory for delete to authenticated
  using (public.is_pharmacy_member(pharmacy_id));

create policy pharmacy_requests_select on public.pharmacy_requests for select to authenticated
  using (patient_id = auth.uid() or public.is_pharmacy_member(pharmacy_id));

create policy pharmacy_request_events_select on public.pharmacy_request_events for select to authenticated
  using (exists (
    select 1 from public.pharmacy_requests r
    where r.id = request_id and (r.patient_id = auth.uid() or public.is_pharmacy_member(r.pharmacy_id))
  ));

create policy prescription_access_select on public.prescription_pharmacy_access for select to authenticated
  using (public.is_pharmacy_member(pharmacy_id));

create policy dispensations_select on public.dispensations for select to authenticated
  using (
    public.is_pharmacy_member(pharmacy_id)
    or exists (
      select 1 from public.prescriptions p
      where p.id = prescription_id and (p.patient_id = auth.uid() or p.doctor_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- negócio
-- ---------------------------------------------------------------------------
create policy plans_select_public on public.plans for select to anon, authenticated
  using (is_active or public.is_admin());
create policy plans_admin_update on public.plans for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy plans_admin_insert on public.plans for insert to authenticated
  with check (public.is_admin());

create policy subscriptions_select on public.subscriptions for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy payments_select on public.payments for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.subscriptions s where s.id = subscription_id and s.profile_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- suporte, notificações, auditoria, configurações, LGPD, favoritos
-- ---------------------------------------------------------------------------
create policy tickets_select on public.support_tickets for select to authenticated
  using (requester_id = auth.uid() or public.is_admin());
create policy tickets_insert on public.support_tickets for insert to authenticated
  with check (requester_id = auth.uid() and status = 'open' and admin_response is null and responded_by is null);

create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- O titular vê quem acessou ou alterou seus dados.
create policy audit_select on public.audit_logs for select to authenticated
  using (public.is_admin() or subject_user_id = auth.uid());

create policy settings_select on public.platform_settings for select to anon, authenticated
  using (is_public or public.is_admin());

create policy dsr_select on public.data_subject_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy dsr_insert on public.data_subject_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and resolved_by is null);

create policy favorites_all on public.favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- rate_limits: sem políticas — acesso somente por funções SECURITY DEFINER.
