-- Genvity :: 1000 — relatórios agregados para a administração.
-- Somente contagens; nenhum dado clínico individual é exposto ao admin.

create or replace function public.admin_report()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'appointments_by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.appointments group by status) x), '{}'::jsonb),
    'prescriptions_by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.prescriptions group by status) x), '{}'::jsonb),
    'prescriptions_by_kind', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from public.prescriptions where status <> 'draft' group by kind) x), '{}'::jsonb),
    'pharmacy_requests_by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.pharmacy_requests group by status) x), '{}'::jsonb),
    'subscriptions_by_plan', coalesce((
      select jsonb_object_agg(name, n) from (
        select pl.name, count(*) n from public.subscriptions s join public.plans pl on pl.id = s.plan_id
        where s.status in ('active', 'trialing', 'pending') group by pl.name
      ) x
    ), '{}'::jsonb),
    'verification_avg_hours', (
      select round(avg(extract(epoch from (reviewed_at - created_at)) / 3600)::numeric, 1)
      from public.verification_requests where reviewed_at is not null
    ),
    'care_relationships_active', (select count(*) from public.care_relationships where status = 'active'),
    'messages_30d', (select count(*) from public.messages where created_at > now() - interval '30 days'),
    'dose_logs_30d', (select count(*) from public.dose_logs where logged_at > now() - interval '30 days')
  ) into v;
  return v;
end;
$$;

revoke execute on function public.admin_report() from public, anon;
grant execute on function public.admin_report() to authenticated;
