import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleBarChart } from "@/components/charts/bar-chart";
import { StatCard } from "@/components/ui/stat-card";
import { APPOINTMENT_STATUS, PHARMACY_REQUEST_STATUS, PRESCRIPTION_KIND, PRESCRIPTION_STATUS } from "@/lib/labels";
import { Clock, HeartHandshake, MessagesSquare, Pill } from "lucide-react";

export const metadata: Metadata = { title: "Relatórios" };

type Report = {
  appointments_by_status: Record<string, number>;
  prescriptions_by_status: Record<string, number>;
  prescriptions_by_kind: Record<string, number>;
  pharmacy_requests_by_status: Record<string, number>;
  subscriptions_by_plan: Record<string, number>;
  verification_avg_hours: number | null;
  care_relationships_active: number;
  messages_30d: number;
  dose_logs_30d: number;
};

function toData<T extends string>(obj: Record<string, number>, labels: Record<T, { label: string }>) {
  return (Object.keys(labels) as T[]).map((k) => ({ label: labels[k].label, value: obj[k] ?? 0 }));
}

export default async function ReportsPage() {
  await requireRole("admin");
  const supabase = await getServerSupabase();
  const { data } = await supabase.rpc("admin_report");
  const r = data as unknown as Report;
  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Indicadores agregados. Nenhum dado clínico individual é exibido à administração." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HeartHandshake} label="Vínculos de cuidado ativos" value={r.care_relationships_active} />
        <StatCard icon={MessagesSquare} label="Mensagens (30 dias)" value={r.messages_30d} tone="info" />
        <StatCard icon={Pill} label="Doses registradas (30 dias)" value={r.dose_logs_30d} tone="success" />
        <StatCard icon={Clock} label="Tempo médio de verificação" value={r.verification_avg_hours != null ? `${String(r.verification_avg_hours).replace(".", ",")} h` : "—"} tone="warning" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Consultas por situação</CardTitle></CardHeader><CardContent><SimpleBarChart valueLabel="Consultas" data={toData(r.appointments_by_status, APPOINTMENT_STATUS)} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Prescrições por situação</CardTitle></CardHeader><CardContent><SimpleBarChart valueLabel="Prescrições" data={toData(r.prescriptions_by_status, PRESCRIPTION_STATUS)} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Prescrições por tipo</CardTitle></CardHeader><CardContent><SimpleBarChart valueLabel="Prescrições" data={toData(r.prescriptions_by_kind, PRESCRIPTION_KIND)} /></CardContent></Card>
        <Card><CardHeader><CardTitle>Solicitações às farmácias</CardTitle></CardHeader><CardContent><SimpleBarChart valueLabel="Solicitações" data={toData(r.pharmacy_requests_by_status, PHARMACY_REQUEST_STATUS)} /></CardContent></Card>
      </div>
    </div>
  );
}
