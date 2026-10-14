"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { allergySchema } from "@/lib/validation/schemas";
import { safeDbError } from "@/lib/errors";

const registerSchema = z.object({
  patientId: z.uuid(),
  storagePath: z.string().min(10).max(300),
  title: z.string().trim().min(2).max(160),
  kind: z.enum(["exam", "report", "prescription", "certificate", "other"]),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

/** Registra metadados de um documento já enviado ao bucket privado. */
export async function registerDocumentAction(input: z.infer<typeof registerSchema>): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados do documento inválidos." };
  const d = parsed.data;
  if (!d.storagePath.startsWith(`${d.patientId}/`)) return { ok: false, error: "Documento inválido." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("documents").insert({
    patient_id: d.patientId,
    uploaded_by: session.userId,
    storage_path: d.storagePath,
    title: d.title,
    kind: d.kind,
    mime_type: d.mimeType,
    size_bytes: d.sizeBytes,
  });
  if (error) {
    await supabase.storage.from("medical-documents").remove([d.storagePath]);
    return { ok: false, error: safeDbError(error, "register document") };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Documento salvo com segurança." };
}

/** Gera URL assinada e temporária (60 s) — a política do bucket verifica a permissão. */
export async function documentUrlAction(documentId: string): Promise<ActionResult<{ url: string }>> {
  await requireSession();
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: "Documento inválido." };
  const supabase = await getServerSupabase();
  const { data: doc } = await supabase.from("documents").select("storage_path, title").eq("id", documentId).maybeSingle();
  if (!doc) return { ok: false, error: "Documento não encontrado." };
  const { data, error } = await supabase.storage.from("medical-documents").createSignedUrl(doc.storage_path, 60, { download: doc.title });
  if (error || !data) return { ok: false, error: "Não foi possível abrir o documento." };
  return { ok: true, data: { url: data.signedUrl } };
}

export async function deleteDocumentAction(documentId: string): Promise<ActionResult> {
  const session = await requireSession();
  if (!z.uuid().safeParse(documentId).success) return { ok: false, error: "Documento inválido." };
  const supabase = await getServerSupabase();
  const { data: doc } = await supabase.from("documents").select("storage_path, uploaded_by").eq("id", documentId).maybeSingle();
  if (!doc || doc.uploaded_by !== session.userId) return { ok: false, error: "Somente quem enviou pode remover o documento." };
  const { error: storageError } = await supabase.storage.from("medical-documents").remove([doc.storage_path]);
  if (storageError) return { ok: false, error: "Não foi possível remover o arquivo." };
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) return { ok: false, error: safeDbError(error, "delete document") };
  revalidatePath("/", "layout");
  return { ok: true, message: "Documento removido." };
}

export async function addAllergyAction(input: z.infer<typeof allergySchema>): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = allergySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("allergies").insert({
    patient_id: parsed.data.patientId,
    substance: parsed.data.substance,
    reaction: parsed.data.reaction ?? null,
    severity: parsed.data.severity,
    recorded_by: session.userId,
  });
  if (error) return { ok: false, error: safeDbError(error, "add allergy") };
  revalidatePath("/", "layout");
  return { ok: true, message: "Alergia registrada." };
}

export async function deleteAllergyAction(id: string): Promise<ActionResult> {
  await requireSession();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getServerSupabase();
  const { error, count } = await supabase.from("allergies").delete({ count: "exact" }).eq("id", id);
  if (error) return { ok: false, error: safeDbError(error, "delete allergy") };
  if (!count) return { ok: false, error: "Você não pode remover este registro." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Registro removido." };
}
