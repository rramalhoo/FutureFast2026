import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PlanEditor, SubscriptionControls } from "@/components/admin/admin-controls";
import { SUBSCRIPTION_STATUS } from "@/lib/labels";
import { fmt } from "@/lib/format";
import { nameOf } from "@/server/queries/patient";

export const metadata: Metadata = { title: "Assinaturas" };

export default async function SubscriptionsPage() {
  await requireRole("admin");
  const supabase = await getServerSupabase();
  const [{ data: plans }, { data: subs }, { data: payments }] = await Promise.all([
    supabase.from("plans").select("*").order("sort_order"),
    supabase.from("subscriptions").select("*, plan:plans(name), profile:profiles!subscriptions_profile_id_fkey(full_name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(20),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Planos e assinaturas" description="Preços de referência, assinaturas e registros de pagamento." />
      <Alert tone="warning" title="Gateway de pagamento não integrado">
        Não há cobrança automática. Pagamentos recebidos por outros meios podem ser registrados manualmente; a arquitetura (provider/provider_reference) está pronta para um gateway.
      </Alert>
      <Card>
        <CardHeader><div><CardTitle>Planos</CardTitle><CardDescription>Valores exibidos no site e na escolha de plano.</CardDescription></div></CardHeader>
        <CardContent className="space-y-3">{(plans ?? []).map((p) => <PlanEditor key={p.id} plan={p} />)}</CardContent>
      </Card>
      <Card className="overflow-x-auto">
        <CardHeader><CardTitle>Assinaturas</CardTitle></CardHeader>
        {subs?.length ? (
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-y border-border bg-surface-muted text-left text-caption text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">Assinante</th><th className="px-4 py-3 font-medium">Plano</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">Situação</th><th className="px-4 py-3 font-medium">Criada</th><th className="px-4 py-3 font-medium">Gestão</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-foreground-strong">{nameOf(s.profile)}</td>
                  <td className="px-4 py-3">{(s.plan as unknown as { name: string } | null)?.name}</td>
                  <td className="px-4 py-3 tabular">{fmt.currency(s.amount_cents)}</td>
                  <td className="px-4 py-3"><Badge tone={SUBSCRIPTION_STATUS[s.status].tone}>{SUBSCRIPTION_STATUS[s.status].label}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{fmt.date(s.created_at)}</td>
                  <td className="px-4 py-3"><SubscriptionControls id={s.id} status={s.status} amountCents={s.amount_cents} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={CreditCard} title="Nenhuma assinatura" />
        )}
      </Card>
      {payments?.length ? (
        <Card>
          <CardHeader><CardTitle>Pagamentos registrados</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {payments.map((p) => <li key={p.id} className="flex justify-between py-2.5"><span>{fmt.dateTime(p.created_at)} · {p.provider}{p.provider_reference ? ` · ${p.provider_reference}` : ""}</span><span className="tabular">{fmt.currency(p.amount_cents)} · {p.status}</span></li>)}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
