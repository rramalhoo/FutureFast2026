"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { type ActionResult, formToObject, fromZodError } from "@/lib/action-result";
import { dispenseSchema, inventorySchema } from "@/lib/validation/schemas";
import { safeDbError } from "@/lib/errors";
import { digits } from "@/lib/utils";
import { BR_STATES } from "@/lib/labels";

const uuid = z.uuid();
const revalidatePharmacy = () => revalidatePath("/farmacia", "layout");

export type VerifiedPrescription = {
  found: true;
  id: string;
  status: "issued" | "dispensed" | "cancelled" | "expired";
  kind: "simple" | "antimicrobial" | "special_control";
  issued_at: string;
  valid_until: string;
  general_instructions: string | null;
  signature_provider: string | null;
  signature_legally_valid: boolean;
  integrity_ok: boolean;
  content_hash: string;
  doctor: { name: string; crm: string; crm_state: string; specialty: string };
  patient: { name: string; birth_date: string | null };
  items: { medication_name: string; presentation: string | null; dosage: string; route: string | null; frequency: string; duration_days: number | null; continuous_use: boolean; quantity: string | null; instructions: string | null }[];
  dispensations: { dispensed_at: string; pharmacy: string; pharmacist_name: string }[];
};

/** Extrai o código de um QR (URL /verificar/<código>) ou do texto digitado. */
function normalizeCode(raw: string) {
  const fromUrl = raw.match(/verificar\/([0-9a-fA-F\s]{32,40})/);
  return digitsHex(fromUrl ? fromUrl[1]! : raw);
}
function digitsHex(v: string) {
  return v.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
}

export async function verifyPrescriptionAction(raw: string): Promise<ActionResult<VerifiedPrescription | { found: false }>> {
  await requireRole("pharmacy");
  const code = normalizeCode(String(raw ?? "").slice(0, 300));
  if (code.length !== 32) return { ok: false, error: "Código inválido. Confira os 32 caracteres ou leia o QR Code novamente." };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.rpc("pharmacy_verify_prescription", { p_code: code });
  if (error) return { ok: false, error: safeDbError(error, "verify prescription") };
  return { ok: true, data: data as unknown as VerifiedPrescription | { found: false } };
}

export async function dispenseAction(input: z.input<typeof dispenseSchema>): Promise<ActionResult> {
  await requireRole("pharmacy");
  const parsed = dispenseSchema.safeParse({ ...input, code: normalizeCode(String(input.code ?? "")) });
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("pharmacy_dispense", {
    p_code: d.code,
    p_pharmacist_name: d.pharmacistName,
    p_pharmacist_crf: d.pharmacistCrf,
    p_notes: d.notes ?? "",
    p_request: (d.requestId ?? null) as string,
  });
  if (error) return { ok: false, error: safeDbError(error, "dispense") };
  revalidatePharmacy();
  return { ok: true, message: "Dispensação registrada. O paciente foi notificado." };
}

const requestUpdateSchema = z.object({
  id: uuid,
  status: z.enum(["received", "reviewing", "awaiting_stock", "preparing", "ready", "completed", "cancelled"]),
  note: z.string().trim().max(500).optional(),
});

export async function updateRequestAction(input: z.infer<typeof requestUpdateSchema>): Promise<ActionResult> {
  await requireRole("pharmacy");
  const parsed = requestUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("pharmacy_update_request", { p_id: parsed.data.id, p_status: parsed.data.status, p_note: parsed.data.note ?? "" });
  if (error) return { ok: false, error: safeDbError(error, "update request") };
  revalidatePharmacy();
  return { ok: true, message: "Andamento atualizado. O paciente foi notificado." };
}

async function myPharmacyId() {
  const supabase = await getServerSupabase();
  const { data } = await supabase.rpc("current_verified_pharmacy");
  return data as string | null;
}

export async function saveInventoryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole("pharmacy");
  const parsed = inventorySchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const pharmacyId = await myPharmacyId();
  if (!pharmacyId) return { ok: false, error: "Disponível após a verificação da farmácia." };
  const d = parsed.data;
  const supabase = await getServerSupabase();
  const row = {
    pharmacy_id: pharmacyId,
    product_name: d.productName,
    presentation: d.presentation ?? null,
    ean: d.ean ?? null,
    quantity: d.quantity,
    stock_status: d.quantity === 0 ? ("unavailable" as const) : d.stockStatus,
    medication_id: d.medicationId ?? null,
    source: "manual",
  };
  const { error } = d.id ? await supabase.from("pharmacy_inventory").update(row).eq("id", d.id) : await supabase.from("pharmacy_inventory").insert(row);
  if (error) return { ok: false, error: safeDbError(error, "inventory") };
  revalidatePharmacy();
  return { ok: true, message: d.id ? "Produto atualizado." : "Produto cadastrado." };
}

export async function quickStockAction(id: string, stockStatus: "available" | "low" | "unavailable"): Promise<ActionResult> {
  await requireRole("pharmacy");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("pharmacy_inventory").update({ stock_status: stockStatus }).eq("id", id);
  if (error) return { ok: false, error: safeDbError(error, "quick stock") };
  revalidatePharmacy();
  return { ok: true };
}

export async function deleteInventoryAction(id: string): Promise<ActionResult> {
  await requireRole("pharmacy");
  if (!uuid.safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("pharmacy_inventory").delete().eq("id", id);
  if (error) return { ok: false, error: safeDbError(error, "delete inventory") };
  revalidatePharmacy();
  return { ok: true, message: "Produto removido." };
}

const settingsSchema = z.object({
  tradeName: z.string().trim().min(2).max(160),
  phone: z.string().transform(digits).refine((v) => v.length >= 10 && v.length <= 11, "Telefone com DDD."),
  addressLine: z.string().trim().min(3).max(240),
  district: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.enum(BR_STATES),
  postalCode: z.string().transform(digits).refine((v) => v.length === 8, "CEP com 8 dígitos."),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  openingHours: z.string().trim().max(300).optional(),
});

export async function updatePharmacySettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("pharmacy");
  const raw = formToObject(formData);
  const parsed = settingsSchema.safeParse({ ...raw, latitude: raw.latitude || undefined, longitude: raw.longitude || undefined });
  if (!parsed.success) return fromZodError(parsed.error);
  const d = parsed.data;
  const supabase = await getServerSupabase();
  const { error, count } = await supabase
    .from("pharmacies")
    .update(
      {
        trade_name: d.tradeName,
        phone: d.phone,
        address_line: d.addressLine,
        district: d.district || null,
        city: d.city,
        state: d.state,
        postal_code: d.postalCode,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        opening_hours: d.openingHours || null,
      },
      { count: "exact" },
    )
    .eq("owner_id", session.userId);
  if (error) return { ok: false, error: safeDbError(error, "pharmacy settings") };
  if (!count) return { ok: false, error: "Somente o responsável pela conta pode alterar estes dados." };
  revalidatePharmacy();
  return { ok: true, message: "Dados da farmácia atualizados." };
}
