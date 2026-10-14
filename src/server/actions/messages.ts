"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";
import { requireRole, requireSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { messageSchema } from "@/lib/validation/schemas";
import { safeDbError } from "@/lib/errors";

export async function startConversationAction(counterpartId: string): Promise<ActionResult<{ id: string }>> {
  await requireRole(["patient", "doctor"]);
  if (!z.uuid().safeParse(counterpartId).success) return { ok: false, error: "Contato inválido." };
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.rpc("start_conversation", { p_counterpart: counterpartId });
  if (error || !data) return { ok: false, error: safeDbError(error, "start conversation") };
  return { ok: true, data: { id: data } };
}

export async function sendMessageAction(input: z.infer<typeof messageSchema>): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Mensagem inválida." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.from("messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: session.userId,
    body: parsed.data.body,
  });
  if (error) {
    if (error.code === "P0429") return { ok: false, error: error.message };
    if (error.message?.includes("row-level security")) return { ok: false, error: "O chat não está disponível para este vínculo." };
    return { ok: false, error: safeDbError(error, "send message") };
  }
  return { ok: true };
}

export async function markConversationReadAction(conversationId: string): Promise<ActionResult> {
  await requireSession();
  if (!z.uuid().safeParse(conversationId).success) return { ok: false, error: "Conversa inválida." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
  if (error) return { ok: false, error: safeDbError(error, "mark read") };
  revalidatePath("/", "layout");
  return { ok: true };
}
