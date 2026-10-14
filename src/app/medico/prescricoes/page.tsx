import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { nameOf } from "@/server/queries/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PRESCRIPTION_KIND, PRESCRIPTION_STATUS } from "@/lib/labels";
import { fmt, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Enums } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Prescrições" };
const FILTERS: { v: string; l: string; statuses?: Enums<"prescription_status">[] }[] = [
  { v: "todas", l: "Todas" },
  { v: "rascunhos", l: "Rascunhos", statuses: ["draft"] },
  { v: "assinatura", l: "Aguardando assinatura", statuses: ["pending_signature"] },
  { v: "emitidas", l: "Emitidas", statuses: ["issued", "dispensed"] },
  { v: "encerradas", l: "Canceladas/expiradas", statuses: ["cancelled", "expired"] },
];

export default async function DoctorPrescriptions({ searchParams }: PageProps<"/medico/prescricoes">) {
  const session = await requireRole("doctor");
  const p = await searchParams;
  const filter = FILTERS.find((f) => f.v === p.filtro) ?? FILTERS[0]!;
  const supabase = await getServerSupabase();
  let query = supabase
    .from("prescriptions")
    .select("id, status, kind, created_at, issued_at, valid_until, patient:patients!inner(profile:profiles!inner(full_name)), prescription_items(medication_name)")
    .eq("doctor_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter.statuses) query = query.in("status", filter.statuses);
  const { data } = await query;
  const today = todayISO();

  return (
    <div className="space-y-6">
      <PageHeader title="Prescrições" description="Rascunhos, assinaturas pendentes e receitas emitidas." actions={<Button asChild><Link href="/medico/prescricoes/nova"><Plus /> Nova prescrição</Link></Button>} />
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar">
        {FILTERS.map((f) => (
          <Link key={f.v} href={`/medico/prescricoes?filtro=${f.v}`} aria-current={filter.v === f.v ? "page" : undefined} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", filter.v === f.v ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground")}>{f.l}</Link>
        ))}
      </nav>
      <Card className="overflow-hidden">
        {data?.length ? (
          <ul className="divide-y divide-border">
            {data.map((r) => {
              const status = r.status === "issued" && r.valid_until && r.valid_until < today ? "expired" : r.status;
              return (
                <li key={r.id}>
                  <Link href={`/medico/prescricoes/${r.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-muted">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground-strong">{nameOf(r.patient)}</span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {(r.prescription_items as { medication_name: string }[]).map((i) => i.medication_name).join(", ") || "Sem itens"} · {PRESCRIPTION_KIND[r.kind].label} · {fmt.date(r.issued_at ?? r.created_at)}
                      </span>
                    </span>
                    <Badge tone={PRESCRIPTION_STATUS[status].tone}>{PRESCRIPTION_STATUS[status].label}</Badge>
                    <ChevronRight className="size-4 text-subtle-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={FileText} title="Nenhuma prescrição" description="Crie uma prescrição para um paciente vinculado." />
        )}
      </Card>
    </div>
  );
}
