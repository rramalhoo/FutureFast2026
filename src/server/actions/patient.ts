"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { type ActionResult, formToObject, fromZodError } from "@/lib/action-result";
import { personalMedicationSchema, reminderSchema, timeSchema } from "@/lib/validation/schemas";
import { safeDbError } from "@/lib/errors";
import { zonedDateTime } from "@/lib/format";

const uuid = z.uuid();

function revalidatePatient() {
  revalidatePath("/paciente", "layout");
}

// ---------------------------------------------------------------------------
// Doses
// ---------------------------------------------------------------------------
const doseSchema = z.object({
  medicationId: uuid,
  scheduledFor: z.iso.datetime({ offset: true }),
  status: z.enum(["taken", "skipped"]),
});

/** Registra a dose como tomada/pulada. Não altera a prescrição. */
export async function logDoseAction(input: z.infer<typeof doseSchema>): Promise<ActionResult> {
  const session = await requireRole("patient");
  const parsed = doseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const scheduled = new Date(parsed.data.scheduledFor);
  if (scheduled.getTime() > Date.now() + 12 * 3600 * 1000) {
    return { ok: false, error: "Não é possível registrar doses com mais de 12 horas de antecedência." };
  }
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("dose_logs").upsert(
    {
      patient_id: session.userId,
      patient_medication_id: parsed.data.medicationId,
      scheduled_for: scheduled.toISOString(),
      status: parsed.data.status,
      logged_at: new Date().toISOString(),
    },
    { onConflict: "patient_medication_id,scheduled_for" },
  );
  if (error) return { ok: false, error: safeDbError(error, "log dose") };
  revalidatePatient();
  return { ok: true, message: parsed.data.status === "taken" ? "Dose registrada como tomada." : "Dose registrada como pulada." };
}

export async function undoDoseAction(medicationId: string, scheduledFor: string): Promise<ActionResult> {
  await requireRole("patient");
  if (!uuid.safeParse(medicationId).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("dose_logs")
    .delete()
    .eq("patient_medication_id", medicationId)
    .eq("scheduled_for", new Date(scheduledFor).toISOString());
  if (error) return { ok: false, error: safeDbError(error, "undo dose") };
  revalidatePatient();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Medicamentos
// ---------------------------------------------------------------------------
export async function addPersonalMedicationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("patient");
  const raw = formToObject(formData);
  const parsed = personalMedicationSchema.safeParse({
    ...raw,
    scheduleTimes: formData.getAll("scheduleTimes").filter(Boolean),
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  if (d.endDate && d.endDate < d.startDate) return { ok: false, error: "O término deve ser após o início.", fieldErrors: { endDate: ["Data inválida."] } };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("patient_medications").insert({
    patient_id: session.userId,
    source: "personal",
    name: d.name,
    presentation: d.presentation ?? null,
    dosage: d.dosage ?? null,
    frequency: d.frequency ?? null,
    schedule_times: [...new Set(d.scheduleTimes)].sort(),
    start_date: d.startDate,
    end_date: d.endDate ?? null,
    instructions: d.instructions ?? null,
    treatment_label: d.treatmentLabel ?? null,
  });
  if (error) return { ok: false, error: safeDbError(error, "add medication") };
  revalidatePatient();
  return { ok: true, message: "Medicamento adicionado ao seu acompanhamento." };
}

const confirmedOcrSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(200),
        dosage: z.string().trim().max(200).optional(),
        frequency: z.string().trim().max(200).optional(),
        scheduleTimes: z.array(timeSchema).max(12).default([]),
        instructions: z.string().trim().max(1000).optional(),
      }),
    )
    .min(1)
    .max(15),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confirmed: z.literal(true),
});

/** Salva itens confirmados pelo paciente a partir do leitor (OCR). Sempre como registro pessoal. */
export async function saveConfirmedOcrAction(input: z.infer<typeof confirmedOcrSchema>): Promise<ActionResult> {
  const session = await requireRole("patient");
  const parsed = confirmedOcrSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revise os itens e confirme a leitura antes de salvar." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("patient_medications").insert(
    parsed.data.items.map((i) => ({
      patient_id: session.userId,
      source: "personal" as const,
      name: i.name,
      dosage: i.dosage || null,
      frequency: i.frequency || null,
      schedule_times: [...new Set(i.scheduleTimes)].sort(),
      start_date: parsed.data.startDate,
      instructions: i.instructions || null,
      treatment_label: "Receita em papel (leitura confirmada)",
    })),
  );
  if (error) return { ok: false, error: safeDbError(error, "save ocr") };
  revalidatePatient();
  return { ok: true, message: "Itens adicionados como registro pessoal." };
}

export async function updateMedicationScheduleAction(medicationId: string, times: string[], remindersEnabled: boolean): Promise<ActionResult> {
  await requireRole("patient");
  const parsed = z.object({ id: uuid, times: z.array(timeSchema).max(24) }).safeParse({ id: medicationId, times });
  if (!parsed.success) return { ok: false, error: "Horários inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("patient_medications")
    .update({ schedule_times: [...new Set(parsed.data.times)].sort(), reminders_enabled: remindersEnabled })
    .eq("id", medicationId);
  if (error) return { ok: false, error: safeDbError(error, "update schedule") };
  revalidatePatient();
  return { ok: true, message: "Horários dos lembretes atualizados." };
}

export async function setMedicationStatusAction(medicationId: string, status: "active" | "paused" | "completed"): Promise<ActionResult> {
  await requireRole("patient");
  if (!uuid.safeParse(medicationId).success || !["active", "paused", "completed"].includes(status)) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("patient_medications").update({ status }).eq("id", medicationId);
  if (error) return { ok: false, error: safeDbError(error, "medication status") };
  revalidatePatient();
  return { ok: true, message: status === "paused" ? "Acompanhamento pausado. Converse com seu médico antes de interromper um tratamento." : "Status atualizado." };
}

export async function deletePersonalMedicationAction(medicationId: string): Promise<ActionResult> {
  await requireRole("patient");
  if (!uuid.safeParse(medicationId).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error, count } = await supabase.from("patient_medications").delete({ count: "exact" }).eq("id", medicationId).eq("source", "personal");
  if (error) return { ok: false, error: safeDbError(error, "delete medication") };
  if (!count) return { ok: false, error: "Somente registros pessoais podem ser removidos." };
  revalidatePatient();
  return { ok: true, message: "Registro removido." };
}

// ---------------------------------------------------------------------------
// Lembretes
// ---------------------------------------------------------------------------
export async function createReminderAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("patient");
  const parsed = reminderSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("reminders").insert({
    patient_id: session.userId,
    title: d.title,
    description: d.description ?? null,
    starts_at: zonedDateTime(d.date, d.time ?? "09:00").toISOString(),
    all_day: !d.time,
  });
  if (error) return { ok: false, error: safeDbError(error, "create reminder") };
  revalidatePatient();
  return { ok: true, message: "Lembrete criado." };
}

export async function toggleReminderAction(id: string, done: boolean): Promise<ActionResult> {
  await requireRole("patient");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("reminders").update({ done }).eq("id", id);
  if (error) return { ok: false, error: safeDbError(error, "toggle reminder") };
  revalidatePatient();
  return { ok: true };
}

export async function deleteReminderAction(id: string): Promise<ActionResult> {
  await requireRole("patient");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("reminders").delete().eq("id", id);
  if (error) return { ok: false, error: safeDbError(error, "delete reminder") };
  revalidatePatient();
  return { ok: true, message: "Lembrete removido." };
}

// ---------------------------------------------------------------------------
// Farmácias
// ---------------------------------------------------------------------------
const pharmacyRequestSchema = z.object({
  pharmacyId: uuid,
  prescriptionId: uuid.optional().or(z.literal("").transform(() => undefined)),
  itemsDescription: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(500).optional(),
  consent: z.literal("on", { message: "Confirme o compartilhamento com a farmácia." }).optional(),
});

export async function createPharmacyRequestAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole("patient");
  const parsed = pharmacyRequestSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  if (d.prescriptionId && d.consent !== "on") {
    return { ok: false, error: "Confirme que autoriza a farmácia a visualizar a receita.", fieldErrors: { consent: ["Obrigatório ao enviar receita."] } };
  }
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("create_pharmacy_request", {
    p_pharmacy: d.pharmacyId,
    p_prescription: (d.prescriptionId ?? null) as string,
    p_items_description: d.itemsDescription ?? "",
    p_note: d.note ?? "",
  });
  if (error) return { ok: false, error: safeDbError(error, "pharmacy request") };
  revalidatePatient();
  return { ok: true, message: "Solicitação enviada. Você será avisado sobre o andamento." };
}

export async function cancelPharmacyRequestAction(id: string): Promise<ActionResult> {
  await requireRole("patient");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("patient_cancel_pharmacy_request", { p_id: id });
  if (error) return { ok: false, error: safeDbError(error, "cancel pharmacy request") };
  revalidatePatient();
  return { ok: true, message: "Solicitação cancelada." };
}

export async function toggleFavoriteAction(targetType: "doctor" | "pharmacy", targetId: string, favorite: boolean): Promise<ActionResult> {
  const session = await requireRole("patient");
  if (!uuid.safeParse(targetId).success || !["doctor", "pharmacy"].includes(targetType)) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = favorite
    ? await supabase.from("favorites").upsert({ user_id: session.userId, target_type: targetType, target_id: targetId })
    : await supabase.from("favorites").delete().eq("user_id", session.userId).eq("target_type", targetType).eq("target_id", targetId);
  if (error) return { ok: false, error: safeDbError(error, "favorite") };
  revalidatePatient();
  return { ok: true };
}
