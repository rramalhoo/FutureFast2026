import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadConversations, loadMessages } from "@/server/queries/messages";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessagesLayout } from "@/components/messages/messages-layout";
import { MessageThread } from "@/components/messages/message-thread";

export const metadata: Metadata = { title: "Mensagens" };

export default async function PatientMessages({ searchParams }: PageProps<"/paciente/mensagens">) {
  const session = await requireRole("patient");
  const p = await searchParams;
  let error: string | null = null;

  if (typeof p.medico === "string" && /^[0-9a-f-]{36}$/.test(p.medico)) {
    const supabase = await getServerSupabase();
    const { data, error: e } = await supabase.rpc("start_conversation", { p_counterpart: p.medico });
    if (data) redirect(`/paciente/mensagens?c=${data}`);
    error = e?.code === "22023" || e?.code === "42501" ? e.message : "Não foi possível iniciar a conversa.";
  }

  const conversations = await loadConversations("patient", session.userId);
  const activeId = typeof p.c === "string" && conversations.some((c) => c.id === p.c) ? p.c : undefined;
  const active = conversations.find((c) => c.id === activeId);
  const messages = activeId ? await loadMessages(activeId) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Mensagens" description="Comunicação segura com seus médicos, quando o serviço estiver habilitado por eles." />
      {error ? <Alert tone="warning">{error}</Alert> : null}
      <MessagesLayout
        basePath="/paciente/mensagens"
        conversations={conversations}
        activeId={activeId}
        emptyAction={<Button asChild size="sm" variant="secondary"><Link href="/paciente/medicos?tab=meus">Meus médicos</Link></Button>}
        header={active ? <><Avatar name={active.name} size="sm" /><div><p className="font-semibold text-foreground-strong">{active.name}</p><p className="text-caption text-muted-foreground">{active.subtitle}</p></div></> : null}
        thread={
          activeId ? (
            <MessageThread
              key={activeId}
              conversationId={activeId}
              currentUserId={session.userId}
              initial={messages}
              disabledReason={active && !active.messagingEnabled ? "O médico desativou o chat. Use os canais de atendimento do consultório." : undefined}
            />
          ) : null
        }
      />
    </div>
  );
}
