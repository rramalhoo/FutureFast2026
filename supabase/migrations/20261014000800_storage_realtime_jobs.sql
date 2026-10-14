-- Genvity :: 0800 — storage privado, realtime e tarefas agendadas

-- ---------------------------------------------------------------------------
-- Buckets privados. Arquivos só são entregues por URLs assinadas e temporárias
-- geradas no servidor após checagem de permissão (políticas abaixo).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('medical-documents', 'medical-documents', false, 10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('verification-documents', 'verification-documents', false, 10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- medical-documents: caminho = {patient_id}/{uuid}-{nome}
create policy "medical documents read" on storage.objects for select to authenticated
  using (
    bucket_id = 'medical-documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = storage.objects.name
        and (
          d.patient_id = auth.uid()
          or d.uploaded_by = auth.uid()
          or public.has_documents_access(auth.uid(), d.patient_id)
        )
    )
  );

create policy "medical documents upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'medical-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        public.is_verified_doctor()
        and public.has_care_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy "medical documents delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'medical-documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = storage.objects.name and d.uploaded_by = auth.uid()
    )
  );

-- verification-documents: caminho = {user_id}/{uuid}-{nome}
create policy "verification documents read" on storage.objects for select to authenticated
  using (
    bucket_id = 'verification-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "verification documents upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Remoção apenas de arquivos ainda não vinculados a uma solicitação enviada.
create policy "verification documents delete unsent" on storage.objects for delete to authenticated
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (
      select 1 from public.verification_requests v
      where v.submitted_by = auth.uid() and storage.objects.name = any (v.document_paths)
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime (respeita RLS) para chat e notificações
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.notifications;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Expiração diária de receitas (pg_cron, quando disponível no projeto)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('genvity-expire-prescriptions', '5 3 * * *', 'select public.expire_prescriptions()');
  end if;
exception when others then
  raise notice 'pg_cron indisponível: agende public.expire_prescriptions() externamente. (%)', sqlerrm;
end;
$$;
