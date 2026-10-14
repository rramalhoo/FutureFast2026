import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { PRESCRIPTION_KIND, PRESCRIPTION_STATUS } from "@/lib/labels";
import { fmt, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Minhas receitas" };

const FILTERS = [
  { v: "todas", l: "Todas" },
  { v: "validas", l: "Válidas" },
  { v: "dispensadas", l: "Dispensadas" },
  { v: "encerradas", l: "Canceladas/expiradas" },
];

export default async function PrescriptionsPage({ searchParams }: PageProps<"/paciente/receitas">) {
  await requireRole("patient");
  const params = await searchParams;
  const filter = FILTERS.some((f) => f.v === params.filtro) ? (params.filtro as string) : "todas";
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("prescriptions")
    .select("id, status, kind, issued_at, valid_until, signature_legally_valid, doctor:doctors!inner(specialty, profile:profiles!inner(full_name)), prescription_items(medication_name)")
    .order("issued_at", { ascending: false });
  const today = todayISO();
  const rows = (data ?? []).map((r) => ({ ...r, effective: r.status === "issued" && r.valid_until && r.valid_until < today ? ("expired" as const) : r.status }));
  const filtered = rows.filter((r) =>
    filter === "validas" ? r.effective === "issued" : filter === "dispensadas" ? r.effective === "dispensed" : filter === "encerradas" ? ["cancelled", "expired"].includes(r.effective) : true,
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Minhas receitas" description="Receitas digitais emitidas pelos seus médicos." />
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar receitas">
        {FILTERS.map((f) => (
          <Link key={f.v} href={`/paciente/receitas?filtro=${f.v}`} aria-current={filter === f.v ? "page" : undefined} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", filter === f.v ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground")}>
            {f.l}
          </Link>
        ))}
      </nav>
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhuma receita aqui" description="Quando um médico vinculado emitir uma receita para você, ela aparecerá nesta lista." />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => {
              const d = r.doctor as unknown as { specialty: string; profile: { full_name: string } };
              const items = (r.prescription_items ?? []) as { medication_name: string }[];
              return (
                <li key={r.id}>
                  <Link href={`/paciente/receitas/${r.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted">
                    <Avatar name={d.profile.full_name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground-strong">{items.map((i) => i.medication_name).join(", ")}</p>
                      <p className="truncate text-caption text-muted-foreground">
                        {d.profile.full_name} · {PRESCRIPTION_KIND[r.kind].label} · emitida em {fmt.date(r.issued_at)} · válida até {fmt.date(r.valid_until)}
                      </p>
                    </div>
                    <Badge tone={PRESCRIPTION_STATUS[r.effective].tone}>{PRESCRIPTION_STATUS[r.effective].label}</Badge>
                    <ChevronRight className="size-4 text-subtle-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
