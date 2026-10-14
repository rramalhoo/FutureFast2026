import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ConversationItem } from "@/components/messages/messages-layout";
import { profileNames } from "./patient";

export async function loadConversations(role: "patient" | "doctor", userId: string) {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("conversations")
    .select(
      "id, subject, last_message_at, doctor_id, patient_id, doctor:doctors(specialty, messaging_enabled)",
    )
    .order("last_message_at", { ascending: false });
  const { data: unread } = await supabase.from("messages").select("conversation_id").is("read_at", null).neq("sender_id", userId);
  const names = await profileNames((data ?? []).flatMap((c) => [c.doctor_id, c.patient_id]));
  const counts = new Map<string, number>();
  for (const u of unread ?? []) counts.set(u.conversation_id, (counts.get(u.conversation_id) ?? 0) + 1);

  const items: (ConversationItem & { counterpartId: string; messagingEnabled: boolean })[] = (data ?? []).map((c) => {
    const doctor = (c.doctor as unknown as { specialty: string; messaging_enabled: boolean } | null) ?? { specialty: "", messaging_enabled: false };
    return {
      id: c.id,
      name: names.get(role === "patient" ? c.doctor_id : c.patient_id) ?? "Contato",
      subtitle: role === "patient" ? doctor.specialty : c.subject,
      lastMessageAt: c.last_message_at,
      unread: counts.get(c.id) ?? 0,
      counterpartId: role === "patient" ? c.doctor_id : c.patient_id,
      messagingEnabled: doctor.messaging_enabled,
    };
  });
  return items;
}

export async function loadMessages(conversationId: string) {
  const supabase = await getServerSupabase();
  const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at").limit(500);
  return data ?? [];
}
