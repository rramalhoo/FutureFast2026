import type { Metadata } from "next";
import { LifeBuoy, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { DsrResolver, TicketResponder } from "@/components/admin/admin-controls";
import { DSR_KIND, DSR_STATUS, TICKET_STATUS } from "@/lib/labels";
import { fmt } from "@/lib/format";
import { nameOf } from "@/server/queries/patient";

export const metadata: Metadata = { title: "Suporte e LGPD" };

export default async function SupportPage() {
  await requireRole("admin");
  const supabase = await getServerSupabase();
  const [{ data: tickets }, { data: dsrs }] = await Promise.all([
    supabase.from("support_tickets").select("*, requester:profiles!support_tickets_requester_id_fkey(full_name)").order("created_at", { ascending: false }).limit(50),
    supabase.from("data_subject_requests").select("*, user:profiles!data_subject_requests_user_id_fkey(full_name)").order("created_at", { ascending: false }).limit(50),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader title="Suporte e LGPD" description="Chamados dos usuários e solicitações de titulares de dados." />
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-h3 font-semibold"><ShieldCheck className="size-5 text-primary" /> Solicitações de titulares (LGPD)</h2>
        <Alert tone="info">Prazo de resposta conforme LGPD e ANPD. Exclusões devem respeitar retenções obrigatórias (ex.: registros de prescrição e dispensação). Exportação está disponível ao próprio titular em Minha conta.</Alert>
        {dsrs?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {dsrs.map((d) => (
              <Card key={d.id}>
                <CardHeader>
                  <div><CardTitle>{DSR_KIND[d.kind]}</CardTitle><p className="mt-1 text-caption text-muted-foreground">{nameOf(d.user)} · {fmt.dateTime(d.created_at)}</p></div>
                  <Badge tone={DSR_STATUS[d.status].tone}>{DSR_STATUS[d.status].label}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">{d.details ? <p className="text-sm">{d.details}</p> : null}<DsrResolver id={d.id} status={d.status} notes={d.resolution_notes} /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><EmptyState compact icon={ShieldCheck} title="Nenhuma solicitação" /></Card>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-h3 font-semibold"><LifeBuoy className="size-5 text-primary" /> Chamados</h2>
        {tickets?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {tickets.map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <div><CardTitle>{t.subject}</CardTitle><p className="mt-1 text-caption text-muted-foreground">{nameOf(t.requester)} · {t.category} · {fmt.dateTime(t.created_at)}</p></div>
                  <Badge tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Badge>
                </CardHeader>
                <CardContent className="space-y-3"><p className="text-sm whitespace-pre-line">{t.body}</p><TicketResponder id={t.id} status={t.status} response={t.admin_response} /></CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><EmptyState compact icon={LifeBuoy} title="Nenhum chamado" /></Card>
        )}
      </section>
    </div>
  );
}
