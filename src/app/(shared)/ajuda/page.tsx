import type { Metadata } from "next";
import { LifeBuoy, Phone } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Faq } from "@/components/marketing/faq";
import { TicketForm } from "@/components/account/ticket-form";
import { RestartTourButton } from "@/components/account/restart-tour";
import { TICKET_STATUS } from "@/lib/labels";
import { fmt } from "@/lib/format";
import type { UserRole } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Central de ajuda" };

const FAQ: Record<UserRole, { q: string; a: string }[]> = {
  patient: [
    { q: "Como recebo uma receita?", a: "Quando seu médico vinculado emite uma receita, ela aparece em Receitas e os medicamentos entram automaticamente em Medicamentos." },
    { q: "Registrar uma dose altera minha prescrição?", a: "Não. O registro de dose é apenas um acompanhamento pessoal. Dose e frequência só podem ser alteradas pelo médico." },
    { q: "Como a farmácia vê minha receita?", a: "Mostrando o QR Code ou enviando uma solicitação pelo app. Você é notificado sempre que uma farmácia consulta sua receita." },
    { q: "Como revogo o acesso de um médico?", a: "Em Minha conta → Privacidade, desative o compartilhamento ou encerre o vínculo." },
  ],
  doctor: [
    { q: "Por que não consigo prescrever?", a: "Prescrições exigem CRM verificado e vínculo ativo com o paciente (consulta confirmada ou convite aceito)." },
    { q: "A receita emitida tem validade jurídica?", a: "Somente com assinatura digital ICP-Brasil integrada. Enquanto o provedor não estiver configurado, a receita é marcada como sem validade jurídica." },
    { q: "Posso editar uma receita emitida?", a: "Não. Receitas emitidas são imutáveis. Cancele com justificativa e emita uma nova." },
    { q: "O assistente pode sugerir condutas?", a: "Não. O assistente é uma ferramenta administrativa e de organização, sem decisões clínicas." },
  ],
  pharmacy: [
    { q: "O QR Code substitui a conferência?", a: "Não. A verificação automática apoia, mas a conferência farmacêutica e as exigências legais continuam obrigatórias." },
    { q: "Por que a consulta foi bloqueada?", a: "Por segurança, há limite de consultas por minuto e apenas farmácias verificadas podem consultar receitas." },
    { q: "Como os pacientes veem meu estoque?", a: "Apenas o status (disponível, baixo, indisponível) e a data da última atualização dos produtos cadastrados." },
  ],
  admin: [{ q: "Onde vejo as verificações pendentes?", a: "Em Verificações. Cada decisão é registrada na auditoria." }],
};

export default async function HelpPage() {
  const session = await requireSession("/ajuda");
  const supabase = await getServerSupabase();
  const { data: tickets } = await supabase.from("support_tickets").select("*").eq("requester_id", session.userId).order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <PageHeader title="Central de ajuda" description="Respostas rápidas e atendimento da equipe Genvity." actions={<RestartTourButton />} />
      <Alert tone="danger" icon={Phone} title="Emergência médica?">
        O Genvity não é serviço de emergência. Ligue 192 (SAMU) ou procure o pronto-atendimento mais próximo.
      </Alert>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="space-y-3">
          <h2 className="text-h3 font-semibold">Perguntas frequentes</h2>
          <Faq items={FAQ[session.profile.role]} />
        </section>
        <div className="space-y-6">
          <Card>
            <CardHeader><div><CardTitle className="flex items-center gap-2"><LifeBuoy className="size-5 text-primary" /> Falar com o suporte</CardTitle><CardDescription>Respondemos pelo app.</CardDescription></div></CardHeader>
            <CardContent><TicketForm /></CardContent>
          </Card>
          {tickets?.length ? (
            <Card>
              <CardHeader><CardTitle>Meus chamados</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tickets.map((t) => (
                    <li key={t.id} className="rounded-2xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground-strong">{t.subject}</p>
                          <p className="text-caption text-muted-foreground">{fmt.dateTime(t.created_at)}</p>
                        </div>
                        <Badge tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Badge>
                      </div>
                      {t.admin_response ? (
                        <p className="mt-3 rounded-xl bg-primary-soft/60 p-3 text-sm text-primary-soft-foreground">{t.admin_response}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
