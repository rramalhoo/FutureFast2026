"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireRole, requireSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { emailSchema } from "@/lib/validation/schemas";
import { safeDbError } from "@/lib/errors";

const uuid = z.uuid();

export async function updateConsentAction(doctorId: string, shareHistory: boolean, shareDocuments: boolean): Promise<ActionResult> {
  await requireRole("patient");
  if (!uuid.safeParse(doctorId).success) return { ok: false, error: "Vínculo inválido." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("update_care_consent", {
    p_doctor: doctorId,
    p_share_history: shareHistory,
    p_share_documents: shareDocuments,
  });
  if (error) return { ok: false, error: safeDbError(error, "update consent") };
  revalidatePath("/conta");
  revalidatePath("/paciente/medicos");
  return { ok: true, message: "Autorização atualizada." };
}

export async function revokeCareAction(counterpartId: string): Promise<ActionResult> {
  await requireSession();
  if (!uuid.safeParse(counterpartId).success) return { ok: false, error: "Vínculo inválido." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("revoke_care", { p_counterpart: counterpartId });
  if (error) return { ok: false, error: safeDbError(error, "revoke care") };
  revalidatePath("/", "layout");
  return { ok: true, message: "Vínculo encerrado. O acesso aos dados foi revogado." };
}

export async function respondInvitationAction(invitationId: string, accept: boolean, shareHistory: boolean, shareDocuments: boolean): Promise<ActionResult> {
  await requireRole("patient");
  if (!uuid.safeParse(invitationId).success) return { ok: false, error: "Convite inválido." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("respond_invitation", {
    p_id: invitationId,
    p_accept: accept,
    p_share_history: shareHistory,
    p_share_documents: shareDocuments,
  });
  if (error) return { ok: false, error: safeDbError(error, "respond invitation") };
  revalidatePath("/paciente/medicos");
  return { ok: true, message: accept ? "Convite aceito." : "Convite recusado." };
}

export async function invitePatientAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole("doctor");
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, error: "Informe um e-mail válido.", fieldErrors: { email: ["E-mail inválido."] } };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("invite_patient", { p_email: parsed.data });
  if (error) return { ok: false, error: safeDbError(error, "invite patient") };
  revalidatePath("/medico/pacientes");
  // Mensagem neutra: não revela se o e-mail possui conta.
  return { ok: true, message: "Convite registrado. Se houver uma conta de paciente com este e-mail, ela verá o convite." };
}
