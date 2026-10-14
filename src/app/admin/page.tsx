import type { Metadata } from "next";
import { BadgeCheck, Building2, CreditCard, FileText, LifeBuoy, Stethoscope, Users, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { SimpleBarChart } from "@/components/charts/bar-chart";
import { ROLE_LABEL } from "@/lib/labels";
import { fmt } from "@/lib/format";
import type { AdminMetrics } from "@/server/queries/admin";

export const metadata: Metadata = { title: "Administração" };



export default async function AdminHome() {
  await requireRole("admin");
  const supabase = await getServerSupabase();
  const { data } = await supabase.rpc("admin_metrics");
  const m = data as unknown as AdminMetrics;

  return (
    <div className="space-y-8">
      <PageHeader title="Administração" description="Indicadores calculados em tempo real a partir dos dados da plataforma." />
      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><StatCard icon={Users} label="Usuários" value={m.users_total} hint={Object.entries(m.users_by_role).map(([r, n]) => `${ROLE_LABEL[r as keyof typeof ROLE_LABEL]}: ${n}`).join(" · ")} href="/admin/usuarios" /></StaggerItem>
        <StaggerItem><StatCard icon={BadgeCheck} label="Verificações pendentes" value={m.pending_verifications} tone="warning" href="/admin/verificacoes" /></StaggerItem>
        <StaggerItem><StatCard icon={Wallet} label="Receita recorrente mensal" value={fmt.currency(m.mrr_cents)} hint={`${m.active_subscriptions} assinatura(s) ativa(s)`} tone="success" href="/admin/assinaturas" /></StaggerItem>
        <StaggerItem><StatCard icon={LifeBuoy} label="Chamados abertos" value={m.open_tickets} hint={`${m.open_dsr} solicitação(ões) LGPD`} tone="info" href="/admin/suporte" /></StaggerItem>
      </Stagger>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Stethoscope} label="Médicos verificados" value={m.doctors_approved} />
        <StatCard icon={Building2} label="Farmácias verificadas" value={m.pharmacies_approved} />
        <StatCard icon={FileText} label="Receitas emitidas (30 dias)" value={m.prescriptions_issued_30d} hint={`${m.dispensations_30d} dispensação(ões)`} />
        <StatCard icon={CreditCard} label="Pagamentos registrados (30 dias)" value={fmt.currency(m.payments_paid_30d_cents)} hint={`${m.pending_subscriptions} aguardando pagamento`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Novos cadastros por semana</CardTitle></CardHeader>
          <CardContent><SimpleBarChart valueLabel="Cadastros" data={m.signups_by_week.map((w) => ({ label: fmt.dateShort(w.week), value: w.count }))} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Receitas emitidas por semana</CardTitle></CardHeader>
          <CardContent><SimpleBarChart valueLabel="Receitas" data={m.prescriptions_by_week.map((w) => ({ label: fmt.dateShort(w.week), value: w.count }))} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
