import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadLinkedPatients } from "@/server/queries/doctor";
import { nameOf } from "@/server/queries/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentButtons } from "@/components/doctor/appointment-buttons";
import { AvailabilityEditor, BlocksEditor } from "@/components/doctor/availability-editor";
import { ScheduleForPatientDialog } from "@/components/doctor/schedule-dialog";
import { AppointmentActions } from "@/components/patient/appointment-actions";
import { APPOINTMENT_STATUS, MODALITY } from "@/lib/labels";
import { addDaysISO, fmt, localDateISO, todayISO, weekdayOf, zonedDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Agenda" };
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function AgendaPage({ searchParams }: PageProps<"/medico/agenda">) {
  const session = await requireRole("doctor");
  const p = await searchParams;
  const base = typeof p.semana === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.semana) ? p.semana : todayISO();
  const from = addDaysISO(base, -weekdayOf(base));
  const to = addDaysISO(from, 7);
  const supabase = await getServerSupabase();
  const [appts, requests, rules, blocks, history, patients] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, doctor_id, starts_at, ends_at, modality, status, reason, patient_id, patient:patients!inner(profile:profiles!inner(full_name))")
      .eq("doctor_id", session.userId)
      .in("status", ["confirmed", "completed", "no_show"])
      .gte("starts_at", zonedDateTime(from, "00:00").toISOString())
      .lt("starts_at", zonedDateTime(to, "00:00").toISOString())
      .order("starts_at"),
    supabase.from("appointments").select("id, starts_at, modality, status, reason, patient:patients!inner(profile:profiles!inner(full_name))").eq("doctor_id", session.userId).eq("status", "requested").order("starts_at"),
    supabase.from("doctor_availability").select("*").eq("doctor_id", session.userId),
    supabase.from("schedule_blocks").select("*").eq("doctor_id", session.userId).gte("ends_at", new Date().toISOString()).order("starts_at"),
    supabase.from("appointments").select("id, starts_at, status, cancellation_reason, rescheduled_from, patient:patients!inner(profile:profiles!inner(full_name))").eq("doctor_id", session.userId).in("status", ["cancelled", "completed", "no_show"]).order("starts_at", { ascending: false }).limit(15),
    loadLinkedPatients(session.userId),
  ]);
  const today = todayISO();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Consultas, solicitações, horários de atendimento e bloqueios."
        actions={<ScheduleForPatientDialog patients={patients} trigger={<Button disabled={!patients.length}><CalendarPlus /> Agendar para paciente</Button>} />}
      />

      {requests.data?.length ? (
        <Card>
          <CardHeader><div><CardTitle>Solicitações aguardando resposta</CardTitle><CardDescription>Confirmar ativa o vínculo com o paciente.</CardDescription></div></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {requests.data.map((a) => (
                <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-center">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground-strong">{nameOf(a.patient)}</span>
                    <span className="text-caption text-muted-foreground">{fmt.weekday(a.starts_at)} às {fmt.time(a.starts_at)} · {MODALITY[a.modality]}{a.reason ? ` · “${a.reason}”` : ""}</span>
                  </span>
                  <AppointmentButtons id={a.id} status={a.status} startsAt={a.starts_at} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="icon" aria-label="Semana anterior"><Link href={`/medico/agenda?semana=${addDaysISO(from, -7)}`}><ChevronLeft /></Link></Button>
          <Button asChild variant="secondary" size="icon" aria-label="Próxima semana"><Link href={`/medico/agenda?semana=${addDaysISO(from, 7)}`}><ChevronRight /></Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href="/medico/agenda">Hoje</Link></Button>
          <h2 className="ml-1 text-h3 font-semibold">{fmt.dateShort(from)} – {fmt.dateShort(addDaysISO(from, 6))}</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = addDaysISO(from, i);
            const list = (appts.data ?? []).filter((a) => localDateISO(a.starts_at) === d);
            return (
              <div key={d} className={cn("surface-card min-h-36 p-3", d === today && "ring-2 ring-primary/30")}>
                <p className="mb-2 flex items-center justify-between text-sm font-semibold">
                  {WEEKDAYS[i]} {Number(d.slice(8))}
                  {d === today ? <Badge tone="brand">Hoje</Badge> : null}
                </p>
                {list.length === 0 ? <p className="text-caption text-muted-foreground">Livre</p> : null}
                <ul className="space-y-1.5">
                  {list.map((a) => (
                    <li key={a.id} className={cn("rounded-xl px-2.5 py-2 text-sm", a.status === "confirmed" ? "bg-primary-soft text-primary-soft-foreground" : "bg-surface-sunken text-muted-foreground")}>
                      <Link href={`/medico/pacientes/${a.patient_id}`} className="block">
                        <span className="block font-semibold tabular">{fmt.time(a.starts_at)}</span>
                        <span className="block truncate">{nameOf(a.patient)}</span>
                        <span className="block text-caption opacity-80">{MODALITY[a.modality]}{a.status !== "confirmed" ? ` · ${APPOINTMENT_STATUS[a.status].label}` : ""}</span>
                      </Link>
                      {a.status === "confirmed" ? (
                        <div className="mt-1.5 flex items-center gap-1">
                          <AppointmentButtons id={a.id} status={a.status} startsAt={a.starts_at} />
                          {new Date(a.starts_at) > new Date() ? <AppointmentActions id={a.id} doctorId={a.doctor_id} modality={a.modality} role="doctor" /> : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><div><CardTitle>Horários de atendimento</CardTitle><CardDescription>Pacientes só conseguem agendar dentro destes horários (fuso de Brasília).</CardDescription></div></CardHeader>
          <CardContent><AvailabilityEditor rules={rules.data ?? []} /></CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><div><CardTitle>Bloqueios de agenda</CardTitle><CardDescription>Férias, congressos e imprevistos.</CardDescription></div></CardHeader>
            <CardContent><BlocksEditor blocks={blocks.data ?? []} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Histórico recente</CardTitle></CardHeader>
            <CardContent>
              {history.data?.length ? (
                <ul className="space-y-2 text-sm">
                  {history.data.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{fmt.dateTime(h.starts_at)} · {nameOf(h.patient)}</span>
                      <Badge tone={APPOINTMENT_STATUS[h.status].tone}>{h.cancellation_reason === "Remarcada" ? "Remarcada" : APPOINTMENT_STATUS[h.status].label}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Sem histórico.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
