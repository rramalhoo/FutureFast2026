import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import { dosesForDay, type DoseLog, type MedicationForSchedule } from "@/lib/doses";
import { addDaysISO, todayISO, zonedDateTime } from "@/lib/format";

export async function loadMedicationsWithLogs(fromISO: string, toISO: string) {
  const supabase = await getServerSupabase();
  const [{ data: meds }, { data: logs }] = await Promise.all([
    supabase.from("patient_medications").select("*").order("created_at", { ascending: false }),
    supabase
      .from("dose_logs")
      .select("patient_medication_id, scheduled_for, status")
      .gte("scheduled_for", zonedDateTime(fromISO, "00:00").toISOString())
      .lt("scheduled_for", zonedDateTime(addDaysISO(toISO, 1), "00:00").toISOString()),
  ]);
  return { meds: meds ?? [], logs: (logs ?? []) as DoseLog[] };
}

export async function loadTodayDoses() {
  const today = todayISO();
  const { meds, logs } = await loadMedicationsWithLogs(today, today);
  return { meds, doses: dosesForDay(meds as MedicationForSchedule[], logs, today) };
}

/** Nome do médico/paciente via embed (respeita RLS de profiles). */
export function nameOf(embed: unknown) {
  const e = embed as { full_name?: string; profile?: { full_name?: string } } | null;
  return e?.full_name ?? e?.profile?.full_name ?? "—";
}
