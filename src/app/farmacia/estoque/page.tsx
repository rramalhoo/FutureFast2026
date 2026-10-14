import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadMyPharmacy } from "@/server/queries/pharmacy";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Alert } from "@/components/ui/alert";
import { InventoryTable } from "@/components/pharmacy/inventory-table";
import { Boxes, CircleCheck, PackageX, TriangleAlert } from "lucide-react";

export const metadata: Metadata = { title: "Estoque" };

export default async function InventoryPage({ searchParams }: PageProps<"/farmacia/estoque">) {
  const session = await requireRole("pharmacy");
  const p = await searchParams;
  const pharmacy = await loadMyPharmacy(session.userId);
  const supabase = await getServerSupabase();
  const [{ data: rows }, { data: catalog }] = await Promise.all([
    supabase.from("pharmacy_inventory").select("*").order("product_name"),
    supabase.from("medications").select("id, name, presentation").order("name"),
  ]);
  const all = rows ?? [];
  const approved = pharmacy?.verification_status === "approved";
  return (
    <div className="space-y-6">
      <PageHeader title="Controle de disponibilidade" description="O que você informar aqui é exibido aos pacientes com a data da última atualização." />
      {!approved ? <Alert tone="warning">O cadastro de produtos é liberado após a verificação da farmácia.</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Boxes} label="Produtos cadastrados" value={all.length} />
        <StatCard icon={CircleCheck} label="Disponíveis" value={all.filter((r) => r.stock_status === "available").length} tone="success" />
        <StatCard icon={TriangleAlert} label="Estoque baixo" value={all.filter((r) => r.stock_status === "low").length} tone="warning" />
        <StatCard icon={PackageX} label="Indisponíveis" value={all.filter((r) => r.stock_status === "unavailable").length} tone="danger" />
      </div>
      <InventoryTable rows={all} catalog={catalog ?? []} initialQuery={typeof p.q === "string" ? p.q : undefined} disabled={!approved} />
    </div>
  );
}
