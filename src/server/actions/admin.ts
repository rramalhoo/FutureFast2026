"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { safeDbError } from "@/lib/errors";
import type { Json } from "@/lib/supabase/database.types";

const uuid = z.uuid();
const revalidateAdmin = () => revalidatePath("/admin", "layout");

export async function reviewVerificationAction(requestId: string, approve: boolean, notes: string): Promise<ActionResult> {
  await requireRole("admin");
  if (!uuid.safeParse(requestId).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("admin_review_verification", { p_request: requestId, p_approve: approve, p_notes: notes });
  if (error) return { ok: false, error: safeDbError(error, "review verification") };
  revalidateAdmin();
  return { ok: true, message: approve ? "Cadastro aprovado." : "Cadastro recusado. O solicitante foi notificado." };
}

export async function verificationDocumentUrlAction(path: string): Promise<ActionResult<{ url: string }>> {
  await requireRole("admin");
  if (!/^[0-9a-f-]{36}\/[\w.-]+$/.test(path)) return { ok: false, error: "Documento inválido." };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.storage.from("verification-documents").createSignedUrl(path, 60);
  if (error || !data) return { ok: false, error: "Não foi possível abrir o documento." };
  return { ok: true, data: { url: data.signedUrl } };
}

/** Suspende/reativa o acesso pelo Auth (ban), com registro em auditoria. */
export async function setUserSuspendedAction(userId: string, suspended: boolean): Promise<ActionResult> {
  const session = await requireRole("admin");
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Dados inválidos." };
  if (userId === session.userId) return { ok: false, error: "Você não pode suspender a própria conta." };
  const admin = getAdminSupabase();
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: suspended ? "876000h" : "none" });
  if (error) return { ok: false, error: "Não foi possível atualizar o acesso do usuário." };
  const supabase = await getServerSupabase();
  await supabase.rpc("admin_log_action", { p_action: suspended ? "user_suspended" : "user_reactivated", p_entity_type: "profile", p_entity_id: userId, p_metadata: {} });
  revalidateAdmin();
  return { ok: true, message: suspended ? "Acesso suspenso." : "Acesso reativado." };
}

export async function setSubscriptionStatusAction(id: string, status: "pending" | "trialing" | "active" | "past_due" | "canceled", amountCents?: number): Promise<ActionResult> {
  await requireRole("admin");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("admin_set_subscription_status", {
    p_id: id,
    p_status: status,
    p_amount_cents: (amountCents ?? null) as number,
    p_period_end: (status === "active" ? new Date(Date.now() + 30 * 86400000).toISOString() : null) as string,
  });
  if (error) return { ok: false, error: safeDbError(error, "subscription status") };
  revalidateAdmin();
  return { ok: true, message: "Assinatura atualizada." };
}

const paymentSchema = z.object({
  subscriptionId: uuid,
  amountCents: z.number().int().min(0).max(100_000_000),
  status: z.enum(["pending", "paid", "failed", "refunded"]),
  reference: z.string().trim().max(120).optional(),
});

export async function recordPaymentAction(input: z.infer<typeof paymentSchema>): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados do pagamento inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("admin_record_payment", {
    p_subscription: parsed.data.subscriptionId,
    p_amount_cents: parsed.data.amountCents,
    p_status: parsed.data.status,
    p_reference: parsed.data.reference ?? "",
  });
  if (error) return { ok: false, error: safeDbError(error, "record payment") };
  revalidateAdmin();
  return { ok: true, message: "Pagamento registrado manualmente." };
}

const planSchema = z.object({
  id: uuid,
  priceMinCents: z.number().int().min(0).nullable(),
  priceMaxCents: z.number().int().min(0).nullable(),
  isActive: z.boolean(),
  description: z.string().trim().max(500),
});

export async function updatePlanAction(input: z.infer<typeof planSchema>): Promise<ActionResult> {
  await requireRole("admin");
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados do plano inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("admin_update_plan", {
    p_id: parsed.data.id,
    p_price_min_cents: parsed.data.priceMinCents as number,
    p_price_max_cents: parsed.data.priceMaxCents as number,
    p_is_active: parsed.data.isActive,
    p_description: parsed.data.description,
  });
  if (error) return { ok: false, error: safeDbError(error, "update plan") };
  revalidatePath("/", "layout");
  return { ok: true, message: "Plano atualizado." };
}

export async function respondTicketAction(id: string, status: "open" | "in_progress" | "resolved" | "closed", response: string): Promise<ActionResult> {
  await requireRole("admin");
  if (!uuid.safeParse(id).success || response.length > 4000) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("admin_respond_ticket", { p_id: id, p_status: status, p_response: response });
  if (error) return { ok: false, error: safeDbError(error, "respond ticket") };
  revalidateAdmin();
  return { ok: true, message: "Chamado atualizado." };
}

export async function resolveDsrAction(id: string, status: "open" | "in_progress" | "completed" | "rejected", notes: string): Promise<ActionResult> {
  await requireRole("admin");
  if (!uuid.safeParse(id).success || notes.length > 2000) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("admin_resolve_dsr", { p_id: id, p_status: status, p_notes: notes });
  if (error) return { ok: false, error: safeDbError(error, "resolve dsr") };
  revalidateAdmin();
  return { ok: true, message: "Solicitação atualizada." };
}

export async function updateSettingAction(key: string, value: Json): Promise<ActionResult> {
  await requireRole("admin");
  if (!/^[a-z0-9_.]{2,80}$/.test(key)) return { ok: false, error: "Configuração inválida." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("admin_update_setting", { p_key: key, p_value: value as NonNullable<Json> });
  if (error) return { ok: false, error: safeDbError(error, "update setting") };
  revalidatePath("/", "layout");
  return { ok: true, message: "Configuração salva." };
}
