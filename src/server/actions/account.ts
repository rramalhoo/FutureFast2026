"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { type ActionResult, formToObject, fromZodError } from "@/lib/action-result";
import { changePasswordSchema, dsrSchema, patientDetailsSchema, profileUpdateSchema, ticketSchema } from "@/lib/validation/schemas";
import { safeDbError } from "@/lib/errors";
import type { Json } from "@/lib/supabase/database.types";

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = profileUpdateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("profiles").update({ full_name: parsed.data.fullName }).eq("id", session.userId);
  if (error) return { ok: false, error: safeDbError(error, "update profile") };
  revalidatePath("/", "layout");
  return { ok: true, message: "Perfil atualizado." };
}

export async function updatePatientDetailsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  if (session.profile.role !== "patient") return { ok: false, error: "Operação não permitida." };
  const raw = formToObject(formData);
  const parsed = patientDetailsSchema.safeParse({ ...raw, cpf: raw.cpf || undefined, sex: raw.sex || undefined });
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("patients")
    .update({
      birth_date: d.birthDate,
      phone: d.phone,
      city: d.city,
      state: d.state,
      cpf: d.cpf ?? null,
      sex: d.sex ?? null,
      emergency_contact_name: d.emergencyContactName ?? null,
      emergency_contact_phone: d.emergencyContactPhone ?? null,
    })
    .eq("id", session.userId);
  if (error) return { ok: false, error: safeDbError(error, "update patient") };
  revalidatePath("/conta");
  return { ok: true, message: "Dados atualizados." };
}

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireSession();
  const parsed = changePasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "reauthentication_needed" || error.code === "reauthentication_not_valid") {
      return { ok: false, error: "Por segurança, saia e entre novamente antes de trocar a senha." };
    }
    if (error.code === "same_password") return { ok: false, error: "A nova senha deve ser diferente da atual." };
    return { ok: false, error: "Não foi possível alterar a senha." };
  }
  return { ok: true, message: "Senha alterada com sucesso." };
}

const preferencesSchema = z.object({
  fontScale: z.enum(["md", "lg", "xl"]).optional(),
  highContrast: z.boolean().optional(),
  reduceMotion: z.boolean().optional(),
  tourDone: z.boolean().optional(),
  notifications: z
    .object({
      appointment: z.boolean(),
      prescription: z.boolean(),
      message: z.boolean(),
      pharmacy_request: z.boolean(),
      medication_reminders: z.boolean(),
    })
    .partial()
    .optional(),
});

export async function updatePreferencesAction(input: z.infer<typeof preferencesSchema>): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Preferências inválidas." };
  const current = (session.profile.preferences ?? {}) as Record<string, unknown>;
  const next = {
    ...current,
    ...parsed.data,
    notifications: { ...((current.notifications as object) ?? {}), ...(parsed.data.notifications ?? {}) },
  };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("profiles").update({ preferences: next as unknown as NonNullable<Json> }).eq("id", session.userId);
  if (error) return { ok: false, error: safeDbError(error, "update preferences") };
  revalidatePath("/", "layout");
  return { ok: true, message: "Preferências salvas." };
}

export async function signOutEverywhereAction(): Promise<ActionResult> {
  await requireSession();
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { ok: false, error: "Não foi possível encerrar as outras sessões." };
  return { ok: true, message: "As sessões em outros dispositivos foram encerradas." };
}

export async function createDsrAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = dsrSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("data_subject_requests")
    .insert({ user_id: session.userId, kind: parsed.data.kind, details: parsed.data.details ?? null });
  if (error) return { ok: false, error: safeDbError(error, "create dsr") };
  revalidatePath("/conta");
  return { ok: true, message: "Solicitação registrada. Responderemos pelo app e por e-mail." };
}

export async function createTicketAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = ticketSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("support_tickets").insert({ requester_id: session.userId, ...parsed.data });
  if (error) return { ok: false, error: safeDbError(error, "create ticket") };
  revalidatePath("/ajuda");
  return { ok: true, message: "Chamado aberto. Você será notificado quando houver resposta." };
}

export async function choosePlanAction(slug: string): Promise<ActionResult> {
  await requireSession();
  const parsed = z.string().regex(/^[a-z0-9-]{2,40}$/).safeParse(slug);
  if (!parsed.success) return { ok: false, error: "Plano inválido." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("choose_plan", { p_slug: parsed.data });
  if (error) return { ok: false, error: safeDbError(error, "choose plan") };
  revalidatePath("/conta");
  return { ok: true, message: "Plano atualizado." };
}

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  await requireSession();
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("cancel_my_subscription");
  if (error) return { ok: false, error: safeDbError(error, "cancel subscription") };
  revalidatePath("/conta");
  return { ok: true, message: "Assinatura cancelada." };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const session = await requireSession();
  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .is("read_at", null);
  if (error) return { ok: false, error: safeDbError(error, "mark notifications") };
  revalidatePath("/notificacoes");
  return { ok: true };
}
