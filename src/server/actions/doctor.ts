"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { type ActionResult, formToObject, fromZodError } from "@/lib/action-result";
import { availabilitySchema, blockSchema, consultationSchema, doctorProfileSchema, prescriptionDraftSchema } from "@/lib/validation/schemas";
import { safeDbError } from "@/lib/errors";
import { zonedDateTime } from "@/lib/format";
import { getSignatureProvider } from "@/lib/signature";

const uuid = z.uuid();
const revalidateDoctor = () => revalidatePath("/medico", "layout");

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------
export async function updateDoctorProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("doctor");
  const raw = formToObject(formData);
  const parsed = doctorProfileSchema.safeParse({
    ...raw,
    modalities: formData.getAll("modalities"),
    acceptingNewPatients: formData.get("acceptingNewPatients") === "on",
    messagingEnabled: formData.get("messagingEnabled") === "on",
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("doctors")
    .update({
      specialty: d.specialty,
      rqe: d.rqe ?? null,
      bio: d.bio ?? null,
      city: d.city,
      state: d.state,
      modalities: d.modalities,
      accepting_new_patients: d.acceptingNewPatients,
      messaging_enabled: d.messagingEnabled,
    })
    .eq("id", session.userId);
  if (error) return { ok: false, error: safeDbError(error, "doctor profile") };
  revalidateDoctor();
  return { ok: true, message: "Perfil profissional atualizado." };
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------
export async function addAvailabilityAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("doctor");
  const parsed = availabilitySchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await getServerSupabase();
  const { data: existing } = await supabase.from("doctor_availability").select("start_time, end_time").eq("doctor_id", session.userId).eq("weekday", d.weekday);
  const overlaps = (existing ?? []).some((e) => e.start_time.slice(0, 5) < d.endTime && d.startTime < e.end_time.slice(0, 5));
  if (overlaps) return { ok: false, error: "Este período se sobrepõe a outro horário do mesmo dia." };
  const { error } = await supabase.from("doctor_availability").insert({
    doctor_id: session.userId,
    weekday: d.weekday,
    start_time: d.startTime,
    end_time: d.endTime,
    slot_minutes: d.slotMinutes,
    modality: d.modality,
  });
  if (error) return { ok: false, error: safeDbError(error, "availability") };
  revalidateDoctor();
  return { ok: true, message: "Horário de atendimento adicionado." };
}

export async function deleteAvailabilityAction(id: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("doctor_availability").delete().eq("id", id);
  if (error) return { ok: false, error: safeDbError(error, "delete availability") };
  revalidateDoctor();
  return { ok: true, message: "Horário removido." };
}

export async function addBlockAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("doctor");
  const parsed = blockSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("schedule_blocks").insert({
    doctor_id: session.userId,
    starts_at: zonedDateTime(d.date, d.startTime).toISOString(),
    ends_at: zonedDateTime(d.date, d.endTime).toISOString(),
    reason: d.reason ?? null,
  });
  if (error) return { ok: false, error: safeDbError(error, "block") };
  revalidateDoctor();
  return { ok: true, message: "Bloqueio adicionado. Esses horários não aparecerão para pacientes." };
}

export async function deleteBlockAction(id: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("schedule_blocks").delete().eq("id", id);
  if (error) return { ok: false, error: safeDbError(error, "delete block") };
  revalidateDoctor();
  return { ok: true, message: "Bloqueio removido." };
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------
export async function createConsultationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("doctor");
  const raw = formToObject(formData);
  const parsed = consultationSchema.safeParse({
    ...raw,
    appointmentId: raw.appointmentId || undefined,
    shareNoteWithPatient: formData.get("shareNoteWithPatient") === "on",
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const occurred = new Date(d.occurredAt);
  if (Number.isNaN(occurred.getTime()) || occurred.getTime() > Date.now() + 3600 * 1000) {
    return { ok: false, error: "Informe uma data de atendimento válida (não futura).", fieldErrors: { occurredAt: ["Data inválida."] } };
  }
  const supabase = await getServerSupabase();
  const { data: consultation, error } = await supabase
    .from("consultations")
    .insert({
      doctor_id: session.userId,
      patient_id: d.patientId,
      appointment_id: d.appointmentId ?? null,
      occurred_at: occurred.toISOString(),
      reason: d.reason ?? null,
      summary_for_patient: d.summaryForPatient ?? null,
      follow_up_date: d.followUpDate ?? null,
      follow_up_notes: d.followUpNotes ?? null,
    })
    .select("id")
    .single();
  if (error || !consultation) return { ok: false, error: safeDbError(error, "consultation") };

  if (d.clinicalNote) {
    const { error: noteError } = await supabase.from("clinical_notes").insert({
      consultation_id: consultation.id,
      doctor_id: session.userId,
      patient_id: d.patientId,
      content: d.clinicalNote,
      shared_with_patient: d.shareNoteWithPatient,
    });
    if (noteError) return { ok: false, error: safeDbError(noteError, "clinical note") };
  }
  if (d.appointmentId) {
    await supabase.rpc("doctor_update_appointment", { p_id: d.appointmentId, p_action: "complete", p_reason: "" });
  }
  revalidateDoctor();
  return { ok: true, message: "Consulta registrada.", data: undefined };
}

// ---------------------------------------------------------------------------
// Prescrições
// ---------------------------------------------------------------------------
type DraftInput = z.input<typeof prescriptionDraftSchema>;

async function writeItems(prescriptionId: string, items: z.infer<typeof prescriptionDraftSchema>["items"]) {
  const supabase = await getServerSupabase();
  const { error: delError } = await supabase.from("prescription_items").delete().eq("prescription_id", prescriptionId);
  if (delError) return delError;
  const { error } = await supabase.from("prescription_items").insert(
    items.map((i, position) => ({
      prescription_id: prescriptionId,
      position,
      medication_id: i.medicationId ?? null,
      medication_name: i.medicationName,
      presentation: i.presentation ?? null,
      dosage: i.dosage,
      route: i.route ?? null,
      frequency: i.frequency,
      times_per_day: i.timesPerDay ?? null,
      schedule_times: [...new Set(i.scheduleTimes)].sort(),
      duration_days: i.continuousUse ? null : (i.durationDays ?? null),
      continuous_use: i.continuousUse,
      quantity: i.quantity ?? null,
      instructions: i.instructions ?? null,
    })),
  );
  return error;
}

/** Cria ou atualiza um rascunho. Retorna o id. */
export async function saveDraftAction(input: DraftInput & { id?: string }): Promise<ActionResult<{ id: string }>> {
  const session = await requireRole("doctor");
  const parsed = prescriptionDraftSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await getServerSupabase();
  let id = input.id;

  if (id) {
    if (!uuid.safeParse(id).success) return { ok: false, error: "Prescrição inválida." };
    const { error, count } = await supabase
      .from("prescriptions")
      .update({ kind: d.kind, valid_until: d.validUntil, general_instructions: d.generalInstructions ?? null }, { count: "exact" })
      .eq("id", id)
      .eq("doctor_id", session.userId)
      .eq("status", "draft");
    if (error) return { ok: false, error: safeDbError(error, "update draft") };
    if (!count) return { ok: false, error: "Somente rascunhos podem ser editados." };
  } else {
    const { data, error } = await supabase
      .from("prescriptions")
      .insert({
        doctor_id: session.userId,
        patient_id: d.patientId,
        kind: d.kind,
        valid_until: d.validUntil,
        general_instructions: d.generalInstructions ?? null,
        consultation_id: d.consultationId ?? null,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: safeDbError(error, "create draft") };
    id = data.id;
  }

  const itemsError = await writeItems(id, d.items);
  if (itemsError) return { ok: false, error: safeDbError(itemsError, "draft items") };
  revalidateDoctor();
  return { ok: true, data: { id }, message: "Rascunho salvo." };
}

export async function deleteDraftAction(id: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error, count } = await supabase.from("prescriptions").delete({ count: "exact" }).eq("id", id).eq("status", "draft");
  if (error) return { ok: false, error: safeDbError(error, "delete draft") };
  if (!count) return { ok: false, error: "Somente rascunhos podem ser excluídos." };
  revalidateDoctor();
  redirect("/medico/prescricoes");
}

export async function submitForSignatureAction(id: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("submit_prescription", { p_id: id });
  if (error) return { ok: false, error: safeDbError(error, "submit prescription") };
  revalidateDoctor();
  return { ok: true, message: "Conteúdo selado para assinatura. Revise e assine." };
}

export async function returnToDraftAction(id: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("return_prescription_to_draft", { p_id: id });
  if (error) return { ok: false, error: safeDbError(error, "return to draft") };
  revalidateDoctor();
  return { ok: true, message: "Prescrição voltou para rascunho." };
}

/**
 * Assina e emite. O hash é obtido do banco (não do cliente), assinado pelo
 * provedor configurado e a emissão é finalizada no servidor com service_role.
 */
export async function signAndIssueAction(id: string, confirmation: boolean): Promise<ActionResult> {
  const session = await requireRole("doctor");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  if (!confirmation) return { ok: false, error: "Confirme a revisão da prescrição." };

  const provider = getSignatureProvider();
  if (!provider.isAvailable()) return { ok: false, error: provider.unavailableReason ?? "Assinatura indisponível." };

  const supabase = await getServerSupabase();
  const { data: rx } = await supabase
    .from("prescriptions")
    .select("id, status, content_hash, doctor_id")
    .eq("id", id)
    .eq("doctor_id", session.userId)
    .maybeSingle();
  if (!rx || rx.status !== "pending_signature" || !rx.content_hash) {
    return { ok: false, error: "A prescrição precisa estar aguardando assinatura." };
  }

  let signature;
  try {
    signature = await provider.sign({ contentHash: rx.content_hash, signerId: session.userId, prescriptionId: id });
  } catch {
    return { ok: false, error: "O provedor de assinatura não respondeu. Tente novamente." };
  }

  const admin = getAdminSupabase();
  const { error } = await admin.rpc("finalize_prescription_issue", {
    p_id: id,
    p_actor: session.userId,
    p_signed_hash: rx.content_hash,
    p_provider: signature.provider,
    p_reference: signature.reference,
    p_legally_valid: signature.legallyValid,
  });
  if (error) return { ok: false, error: safeDbError(error, "finalize issue") };
  revalidateDoctor();
  return {
    ok: true,
    message: signature.legallyValid ? "Prescrição assinada e emitida." : "Prescrição emitida com selo de desenvolvimento (sem validade jurídica).",
  };
}

export async function cancelPrescriptionAction(id: string, reason: string): Promise<ActionResult> {
  await requireRole("doctor");
  const parsed = z.object({ id: uuid, reason: z.string().trim().min(5, "Descreva o motivo (mín. 5 caracteres).").max(500) }).safeParse({ id, reason });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("cancel_prescription", { p_id: id, p_reason: parsed.data.reason });
  if (error) return { ok: false, error: safeDbError(error, "cancel prescription") };
  revalidateDoctor();
  return { ok: true, message: "Prescrição cancelada. O paciente foi notificado." };
}

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------
const taskSchema = z.object({
  title: z.string().trim().min(2, "Descreva a tarefa.").max(200),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("").transform(() => undefined)),
  patientId: uuid.optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(1000).optional(),
});

export async function createTaskAction(input: z.input<typeof taskSchema>): Promise<ActionResult> {
  const session = await requireRole("doctor");
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("doctor_tasks").insert({
    doctor_id: session.userId,
    title: parsed.data.title,
    due_date: parsed.data.dueDate ?? null,
    patient_id: parsed.data.patientId ?? null,
    notes: parsed.data.notes ?? null,
  });
  if (error) return { ok: false, error: safeDbError(error, "create task") };
  revalidateDoctor();
  return { ok: true, message: "Tarefa criada." };
}

export async function toggleTaskAction(id: string, done: boolean): Promise<ActionResult> {
  await requireRole("doctor");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("doctor_tasks").update({ done }).eq("id", id);
  if (error) return { ok: false, error: safeDbError(error, "toggle task") };
  revalidateDoctor();
  return { ok: true };
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  await requireRole("doctor");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("doctor_tasks").delete().eq("id", id);
  if (error) return { ok: false, error: safeDbError(error, "delete task") };
  revalidateDoctor();
  return { ok: true };
}

export async function patientAllergiesAction(patientId: string) {
  await requireRole("doctor");
  if (!uuid.safeParse(patientId).success) return [];
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("allergies").select("substance, reaction, severity").eq("patient_id", patientId);
  return data ?? [];
}
