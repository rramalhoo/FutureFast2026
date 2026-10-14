"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import { type ActionResult, formToObject, fromZodError } from "@/lib/action-result";
import { doctorOnboardingSchema, patientOnboardingSchema, pharmacyOnboardingSchema } from "@/lib/validation/schemas";
import { safeDbError } from "@/lib/errors";

const documentPaths = z.array(z.string().min(3).max(300)).min(1, "Envie ao menos um documento.");

export async function completePatientOnboarding(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  if (session.profile.role !== "patient") return { ok: false, error: "Operação não permitida." };
  const raw = formToObject(formData);
  const parsed = patientOnboardingSchema.safeParse({ ...raw, sex: raw.sex || undefined, cpf: raw.cpf || undefined });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await getServerSupabase();
  const d = parsed.data;
  const { error } = await supabase.rpc("complete_patient_onboarding", {
    p_full_name: d.fullName,
    p_birth_date: d.birthDate,
    p_phone: d.phone,
    p_city: d.city,
    p_state: d.state,
    p_cpf: d.cpf,
    p_sex: d.sex,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Este CPF já está vinculado a outra conta.", fieldErrors: { cpf: ["CPF já cadastrado."] } };
    return { ok: false, error: safeDbError(error, "patient onboarding") };
  }
  redirect("/paciente?bem-vindo=1");
}

export async function completeDoctorOnboarding(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  if (session.profile.role !== "doctor") return { ok: false, error: "Operação não permitida." };
  const raw = formToObject(formData);
  const modalities = formData.getAll("modalities");
  const parsed = doctorOnboardingSchema.safeParse({ ...raw, modalities });
  if (!parsed.success) return fromZodError(parsed.error);
  const paths = documentPaths.safeParse(formData.getAll("documentPaths"));
  if (!paths.success) return { ok: false, error: "Envie o documento do CRM (frente e verso) para verificação." };
  if (paths.data.some((p) => !p.startsWith(`${session.userId}/`))) return { ok: false, error: "Documento inválido." };

  const supabase = await getServerSupabase();
  const d = parsed.data;
  const { error } = await supabase.rpc("complete_doctor_onboarding", {
    p_full_name: d.fullName,
    p_crm: d.crm,
    p_crm_state: d.crmState,
    p_specialty: d.specialty,
    p_rqe: d.rqe ?? "",
    p_city: d.city,
    p_state: d.state,
    p_modalities: d.modalities,
    p_bio: d.bio ?? "",
    p_document_paths: paths.data,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Este CRM já está cadastrado. Fale com o suporte se for seu.", fieldErrors: { crm: ["CRM já cadastrado."] } };
    return { ok: false, error: safeDbError(error, "doctor onboarding") };
  }
  redirect("/medico?verificacao=enviada");
}

export async function completePharmacyOnboarding(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  if (session.profile.role !== "pharmacy") return { ok: false, error: "Operação não permitida." };
  const raw = formToObject(formData);
  const parsed = pharmacyOnboardingSchema.safeParse({
    ...raw,
    latitude: raw.latitude || undefined,
    longitude: raw.longitude || undefined,
  });
  if (!parsed.success) return fromZodError(parsed.error);
  const paths = documentPaths.safeParse(formData.getAll("documentPaths"));
  if (!paths.success) return { ok: false, error: "Envie a AFE e o comprovante de responsabilidade técnica." };
  if (paths.data.some((p) => !p.startsWith(`${session.userId}/`))) return { ok: false, error: "Documento inválido." };

  const supabase = await getServerSupabase();
  const d = parsed.data;
  const { error } = await supabase.rpc("complete_pharmacy_onboarding", {
    p_full_name: d.fullName,
    p_trade_name: d.tradeName,
    p_legal_name: d.legalName,
    p_cnpj: d.cnpj,
    p_afe_number: d.afeNumber,
    p_technical_responsible: d.technicalResponsible,
    p_technical_responsible_crf: d.technicalResponsibleCrf,
    p_phone: d.phone,
    p_address_line: d.addressLine,
    p_district: d.district ?? "",
    p_city: d.city,
    p_state: d.state,
    p_postal_code: d.postalCode,
    p_latitude: (d.latitude ?? null) as number,
    p_longitude: (d.longitude ?? null) as number,
    p_opening_hours: d.openingHours ?? "",
    p_document_paths: paths.data,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Este CNPJ já está cadastrado.", fieldErrors: { cnpj: ["CNPJ já cadastrado."] } };
    return { ok: false, error: safeDbError(error, "pharmacy onboarding") };
  }
  redirect("/farmacia?verificacao=enviada");
}
