import { APP_TIME_ZONE, todayISO, zonedDateTime } from "./format";

export type MedicationForSchedule = {
  id: string;
  name: string;
  dosage: string | null;
  presentation?: string | null;
  schedule_times: string[];
  start_date: string;
  end_date: string | null;
  status: string;
  reminders_enabled?: boolean;
};

export type DoseLog = { patient_medication_id: string; scheduled_for: string; status: "taken" | "skipped" };

export type ScheduledDose = {
  medicationId: string;
  name: string;
  dosage: string | null;
  time: string; // HH:MM
  scheduledFor: string; // ISO UTC
  status: "taken" | "skipped" | "pending" | "missed";
};

/** Uma medicação está vigente na data (YYYY-MM-DD)? */
export function isActiveOn(med: Pick<MedicationForSchedule, "start_date" | "end_date" | "status">, dateISO: string) {
  if (med.status !== "active") return false;
  if (med.start_date > dateISO) return false;
  if (med.end_date && med.end_date < dateISO) return false;
  return true;
}

/**
 * Doses planejadas de um dia, combinadas com os registros existentes.
 * Doses passadas há mais de 2h sem registro são marcadas como "missed".
 */
export function dosesForDay(
  meds: MedicationForSchedule[],
  logs: DoseLog[],
  dateISO: string,
  now: Date = new Date(),
): ScheduledDose[] {
  const logMap = new Map(logs.map((l) => [`${l.patient_medication_id}|${new Date(l.scheduled_for).toISOString()}`, l.status]));
  const doses: ScheduledDose[] = [];
  for (const med of meds) {
    if (!isActiveOn(med, dateISO)) continue;
    for (const raw of med.schedule_times) {
      const time = raw.slice(0, 5);
      const at = zonedDateTime(dateISO, time);
      const iso = at.toISOString();
      const logged = logMap.get(`${med.id}|${iso}`);
      const status = logged ?? (now.getTime() - at.getTime() > 2 * 3600 * 1000 ? "missed" : "pending");
      doses.push({ medicationId: med.id, name: med.name, dosage: med.dosage, time, scheduledFor: iso, status });
    }
  }
  return doses.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor) || a.name.localeCompare(b.name));
}

/** Próxima dose pendente (a partir de agora, ou a mais atrasada ainda pendente). */
export function nextDose(doses: ScheduledDose[], now: Date = new Date()) {
  const pending = doses.filter((d) => d.status === "pending");
  return pending.find((d) => new Date(d.scheduledFor) >= new Date(now.getTime() - 30 * 60 * 1000)) ?? pending[0] ?? null;
}

export function adherence(doses: ScheduledDose[]) {
  const due = doses.filter((d) => d.status !== "pending");
  const taken = doses.filter((d) => d.status === "taken").length;
  return { total: doses.length, taken, due: due.length, percent: doses.length ? Math.round((taken / doses.length) * 100) : 0 };
}

export { APP_TIME_ZONE, todayISO };
