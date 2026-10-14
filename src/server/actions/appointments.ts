"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireRole, requireSession } from "@/lib/auth";
import { type ActionResult, formToObject, fromZodError } from "@/lib/action-result";
import { safeDbError } from "@/lib/errors";
import { zonedDateTime } from "@/lib/format";

const uuid = z.uuid();

const requestSchema = z.object({
  doctorId: uuid,
  startsAt: z.iso.datetime({ offset: true }),
  modality: z.enum(["in_person", "telehealth"]),
  reason: z.string().trim().max(500).optional(),
  shareHistory: z.enum(["on"]).optional(),
  shareDocuments: z.enum(["on"]).optional(),
});

export async function requestAppointmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole("patient");
  const parsed = requestSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("request_appointment", {
    p_doctor: d.doctorId,
    p_starts_at: new Date(d.startsAt).toISOString(),
    p_modality: d.modality,
    p_reason: d.reason ?? "",
    p_share_history: d.shareHistory === "on",
    p_share_documents: d.shareDocuments === "on",
  });
  if (error) return { ok: false, error: safeDbError(error, "request appointment") };
  revalidatePath("/paciente", "layout");
  return { ok: true, message: "Solicitação enviada! Você será notificado quando o médico confirmar." };
}

export async function patientCancelAppointmentAction(id: string, reason?: string): Promise<ActionResult> {
  await requireRole("patient");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("patient_cancel_appointment", { p_id: id, p_reason: reason ?? "" });
  if (error) return { ok: false, error: safeDbError(error, "cancel appointment") };
  revalidatePath("/paciente", "layout");
  return { ok: true, message: "Consulta cancelada." };
}

export async function rescheduleAppointmentAction(id: string, newStart: string): Promise<ActionResult> {
  await requireSession();
  if (!uuid.safeParse(id).success || Number.isNaN(Date.parse(newStart))) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("reschedule_appointment", { p_id: id, p_new_start: new Date(newStart).toISOString() });
  if (error) return { ok: false, error: safeDbError(error, "reschedule") };
  revalidatePath("/", "layout");
  return { ok: true, message: "Consulta remarcada." };
}

/** Horários livres de um médico (para agendar ou remarcar). */
export async function availableSlotsAction(doctorId: string, fromISO: string, days = 14) {
  await requireSession();
  if (!uuid.safeParse(doctorId).success || !/^\d{4}-\d{2}-\d{2}$/.test(fromISO)) return [];
  const supabase = await getServerSupabase();
  const { data } = await supabase.rpc("get_available_slots", { p_doctor: doctorId, p_from: fromISO, p_days: Math.min(Math.max(days, 1), 30) });
  return data ?? [];
}

const doctorActionSchema = z.object({
  id: uuid,
  action: z.enum(["confirm", "decline", "cancel", "complete", "no_show"]),
  reason: z.string().trim().max(500).optional(),
});

export async function doctorUpdateAppointmentAction(input: z.infer<typeof doctorActionSchema>): Promise<ActionResult> {
  await requireRole("doctor");
  const parsed = doctorActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("doctor_update_appointment", {
    p_id: parsed.data.id,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason ?? "",
  });
  if (error) return { ok: false, error: safeDbError(error, "doctor appointment") };
  revalidatePath("/medico", "layout");
  const messages = {
    confirm: "Consulta confirmada. O paciente foi notificado.",
    decline: "Solicitação recusada.",
    cancel: "Consulta cancelada. O paciente foi notificado.",
    complete: "Consulta marcada como realizada.",
    no_show: "Ausência registrada.",
  };
  return { ok: true, message: messages[parsed.data.action] };
}

const scheduleSchema = z.object({
  patientId: uuid,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido."),
  duration: z.coerce.number().int().min(10).max(240),
  modality: z.enum(["in_person", "telehealth"]),
  reason: z.string().trim().max(500).optional(),
});

export async function doctorScheduleAppointmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole("doctor");
  const parsed = scheduleSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("doctor_schedule_appointment", {
    p_patient: d.patientId,
    p_starts_at: zonedDateTime(d.date, d.time).toISOString(),
    p_duration_minutes: d.duration,
    p_modality: d.modality,
    p_reason: d.reason ?? "",
  });
  if (error) return { ok: false, error: safeDbError(error, "doctor schedule") };
  revalidatePath("/medico", "layout");
  return { ok: true, message: "Consulta agendada e confirmada. O paciente foi notificado." };
}
