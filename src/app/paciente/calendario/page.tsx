import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadMedicationsWithLogs } from "@/server/queries/patient";
import { dosesForDay, type MedicationForSchedule } from "@/lib/doses";
import { addDaysISO, calendarRange, type CalendarView as View, fmt, localDateISO, todayISO, zonedDateTime } from "@/lib/format";
import { APPOINTMENT_STATUS, MODALITY } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { CalendarView, type CalendarEvent } from "@/components/patient/calendar-view";

export const metadata: Metadata = { title: "Calendário" };

export default async function CalendarPage({ searchParams }: PageProps<"/paciente/calendario">) {
  await requireRole("patient");
  const params = await searchParams;
  const view: View = params.view === "day" || params.view === "week" ? params.view : "month";
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayISO();
  const { from, to } = calendarRange(view, date);
  const fromTs = zonedDateTime(from, "00:00").toISOString();
  const toTs = zonedDateTime(addDaysISO(to, 1), "00:00").toISOString();

  const supabase = await getServerSupabase();
  const [appts, reminders, followups, { meds, logs }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, starts_at, modality, status, doctor:doctors!inner(specialty, profile:profiles!inner(full_name))")
      .gte("starts_at", fromTs)
      .lt("starts_at", toTs)
      .neq("status", "cancelled"),
    supabase.from("reminders").select("*").gte("starts_at", fromTs).lt("starts_at", toTs),
    supabase
      .from("consultations")
      .select("id, follow_up_date, follow_up_notes, doctor:doctors!inner(profile:profiles!inner(full_name))")
      .gte("follow_up_date", from)
      .lte("follow_up_date", to),
    loadMedicationsWithLogs(from, to),
  ]);

  const events: CalendarEvent[] = [];
  for (const a of appts.data ?? []) {
    const d = a.doctor as unknown as { specialty: string; profile: { full_name: string } };
    events.push({
      id: a.id,
      kind: "appointment",
      title: d.profile.full_name,
      subtitle: `${d.specialty} · ${MODALITY[a.modality]}`,
      date: localDateISO(a.starts_at),
      time: fmt.time(a.starts_at),
      status: a.status,
      statusLabel: APPOINTMENT_STATUS[a.status].label,
      statusTone: APPOINTMENT_STATUS[a.status].tone,
    });
  }
  for (const r of reminders.data ?? []) {
    events.push({ id: r.id, kind: "reminder", title: r.title, subtitle: r.description ?? undefined, date: localDateISO(r.starts_at), time: r.all_day ? undefined : fmt.time(r.starts_at), done: r.done });
  }
  for (const f of followups.data ?? []) {
    const d = f.doctor as unknown as { profile: { full_name: string } };
    events.push({ id: f.id, kind: "followup", title: `Retorno sugerido`, subtitle: [d.profile.full_name, f.follow_up_notes].filter(Boolean).join(" · "), date: f.follow_up_date! });
  }
  for (let d = from; d <= to; d = addDaysISO(d, 1)) {
    for (const dose of dosesForDay(meds as MedicationForSchedule[], logs, d)) {
      events.push({
        id: `${dose.medicationId}-${dose.scheduledFor}`,
        kind: "dose",
        title: dose.name,
        subtitle: dose.dosage ?? undefined,
        date: d,
        time: dose.time,
        done: dose.status === "taken" || dose.status === "skipped",
        statusLabel: { taken: "Tomada", skipped: "Pulada", pending: "Pendente", missed: "Sem registro" }[dose.status],
        statusTone: dose.status === "taken" ? "success" : dose.status === "missed" ? "warning" : "neutral",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Calendário" description="Medicamentos, consultas, retornos e lembretes em um só lugar." />
      <CalendarView view={view} date={date} from={from} events={events} />
    </div>
  );
}
