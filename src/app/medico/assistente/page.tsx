import type { Metadata } from "next";
import { Bot, ListTodo } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { isVerified, loadLinkedPatients } from "@/server/queries/doctor";
import { assistantConfigured } from "@/lib/ai/assistant";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { AssistantPanel } from "@/components/doctor/assistant-panel";
import { TasksPanel } from "@/components/doctor/tasks-panel";

export const metadata: Metadata = { title: "Assistente" };

export default async function AssistantPage() {
  const session = await requireRole("doctor");
  const supabase = await getServerSupabase();
  const [verified, patients, { data: tasks }, { data: setting }] = await Promise.all([
    isVerified(session.userId),
    loadLinkedPatients(session.userId),
    supabase.from("doctor_tasks").select("*").eq("doctor_id", session.userId).order("done").order("due_date", { nullsFirst: false }),
    supabase.from("platform_settings").select("value").eq("key", "assistant.enabled").maybeSingle(),
  ]);
  const names = new Map(patients.map((p) => [p.id, p.name]));
  const enabled = setting?.value !== false;

  return (
    <div className="space-y-6">
      <PageHeader title="Assistente" description="Ferramenta de apoio à produtividade. Não toma decisões clínicas e todo conteúdo exige sua revisão." />
      <Alert tone="brand" icon={Bot}>
        O assistente trabalha apenas com o texto que você fornecer — ele não acessa prontuários automaticamente. Evite incluir dados identificáveis de pacientes. Para localizar registros autorizados, use a pesquisa global (Ctrl+K).
      </Alert>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader><div><CardTitle className="flex items-center gap-2"><Bot className="size-5 text-primary" /> Assistente de IA</CardTitle><CardDescription>Resumos, rascunhos administrativos, organização e ajuda.</CardDescription></div></CardHeader>
          <CardContent>
            {!verified ? <Alert tone="warning">Disponível após a verificação do CRM.</Alert> : <AssistantPanel configured={assistantConfigured() && enabled} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ListTodo className="size-5 text-primary" /> Tarefas</CardTitle></CardHeader>
          <CardContent>
            <TasksPanel tasks={(tasks ?? []).map((t) => ({ ...t, patient_name: t.patient_id ? names.get(t.patient_id) : undefined }))} patients={patients} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
