import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, ClipboardCheck, Inbox, PackageCheck, QrCode, TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadMyPharmacy } from "@/server/queries/pharmacy";
import { profileNames } from "@/server/queries/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { PHARMACY_REQUEST_STATUS } from "@/lib/labels";
import { fmt, todayISO, zonedDateTime } from "@/lib/format";
import { nowMs } from "@/lib/clock";

export const metadata: Metadata = { title: "Painel da farmácia" };

export default async function PharmacyHome({ searchParams }: PageProps<"/farmacia">) {
  const session = await requireRole("pharmacy");
  const params = await searchParams;
  const pharmacy = await loadMyPharmacy(session.userId);
  const approved = pharmacy?.verification_status === "approved";
  const supabase = await getServerSupabase();
  const since30 = new Date(nowMs() - 30 * 86400000).toISOString();
  const todayStart = zonedDateTime(todayISO(), "00:00").toISOString();
  const staleBefore = new Date(nowMs() - 7 * 86400000).toISOString();

  const [requests, dispensed, lookupsToday, inventory] = await Promise.all([
    supabase.from("pharmacy_requests").select("id, status, created_at, items_description, prescription_id, patient_id").order("created_at", { ascending: false }).limit(50),
    supabase.from("dispensations").select("id", { count: "exact", head: true }).gte("dispensed_at", since30),
    supabase.from("prescription_pharmacy_access").select("id", { count: "exact", head: true }).gte("accessed_at", todayStart),
    supabase.from("pharmacy_inventory").select("id, product_name, stock_status, updated_at"),
  ]);
  const reqs = requests.data ?? [];
  const names = await profileNames(reqs.map((r) => r.patient_id));
  const open = reqs.filter((r) => !["completed", "cancelled"].includes(r.status));
  const pendingReview = open.filter((r) => ["received", "reviewing"].includes(r.status) && r.prescription_id);
  const inv = inventory.data ?? [];
  const stale = inv.filter((i) => i.updated_at < staleBefore);
  const low = inv.filter((i) => i.stock_status === "low");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={pharmacy?.trade_name}
        title="Painel da farmácia"
        description="Solicitações, conferências e disponibilidade em tempo real."
        actions={approved ? <Button asChild><Link href="/farmacia/leitor"><QrCode /> Ler receita</Link></Button> : null}
      />
      {params.verificacao === "enviada" ? <Alert tone="success" title="Cadastro enviado">A equipe Genvity vai conferir CNPJ, AFE e responsável técnico. Você será notificado.</Alert> : null}
      {!approved ? <Alert tone="warning" title="Verificação em andamento">Consultas de receitas, solicitações de pacientes e exibição na busca são liberadas após a aprovação.</Alert> : null}

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><StatCard icon={Inbox} label="Solicitações em aberto" value={open.length} href="/farmacia/solicitacoes" /></StaggerItem>
        <StaggerItem><StatCard icon={ClipboardCheck} label="Receitas para conferir" value={pendingReview.length} tone="warning" href="/farmacia/solicitacoes" /></StaggerItem>
        <StaggerItem><StatCard icon={PackageCheck} label="Dispensações (30 dias)" value={dispensed.count ?? 0} tone="success" href="/farmacia/prescricoes" /></StaggerItem>
        <StaggerItem><StatCard icon={QrCode} label="Consultas de receita hoje" value={lookupsToday.count ?? 0} tone="info" /></StaggerItem>
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Solicitações recentes</CardTitle><Button asChild variant="ghost" size="sm"><Link href="/farmacia/solicitacoes">Ver todas</Link></Button></CardHeader>
          <CardContent>
            {open.length ? (
              <ul className="divide-y divide-border">
                {open.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground-strong">{names.get(r.patient_id) ?? "Paciente"}</span>
                      <span className="block truncate text-caption text-muted-foreground">{r.prescription_id ? "Com receita · " : ""}{r.items_description ?? "—"} · {fmt.relative(r.created_at)}</span>
                    </span>
                    <Badge tone={PHARMACY_REQUEST_STATUS[r.status].tone}>{PHARMACY_REQUEST_STATUS[r.status].label}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={Inbox} title="Nenhuma solicitação em aberto" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Alertas operacionais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {inv.length === 0 ? <Alert tone="info" icon={Boxes} action={<Button asChild size="sm" variant="secondary"><Link href="/farmacia/estoque">Cadastrar</Link></Button>}>Nenhum produto cadastrado. Pacientes verão “sem dados de estoque”.</Alert> : null}
            {stale.length ? <Alert tone="warning" icon={TriangleAlert} title={`${stale.length} produto(s) sem atualização há mais de 7 dias`}>Pacientes veem a data da última atualização. Mantenha a disponibilidade em dia.</Alert> : null}
            {low.length ? <Alert tone="warning" title={`${low.length} produto(s) com estoque baixo`}>{low.slice(0, 5).map((l) => l.product_name).join(", ")}</Alert> : null}
            {inv.length && !stale.length && !low.length ? <p className="text-sm text-muted-foreground">Nenhum alerta no momento.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
