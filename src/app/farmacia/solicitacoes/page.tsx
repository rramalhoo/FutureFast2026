import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RequestCard } from "@/components/pharmacy/request-card";
import { PHARMACY_REQUEST_STATUS } from "@/lib/labels";
import { profileNames } from "@/server/queries/patient";
import type { Enums } from "@/lib/supabase/types";

export const metadata: Metadata = { title: "Solicitações" };

const COLUMNS: { title: string; statuses: Enums<"pharmacy_request_status">[] }[] = [
  { title: "1 · Recebidas", statuses: ["received"] },
  { title: "2 · Conferência", statuses: ["reviewing", "awaiting_stock"] },
  { title: "3 · Separação", statuses: ["preparing"] },
  { title: "4 · Prontas", statuses: ["ready"] },
];

export default async function RequestsPage() {
  await requireRole("pharmacy");
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("pharmacy_requests")
    .select("id, status, created_at, items_description, patient_note, pharmacy_note, prescription_id, patient_id")
    .order("created_at", { ascending: true })
    .limit(200);
  const names = await profileNames((data ?? []).map((r) => r.patient_id));
  const rows = (data ?? []).map((r) => ({ ...r, patient_name: names.get(r.patient_id) ?? "Paciente" }));
  const closed = rows.filter((r) => ["completed", "cancelled"].includes(r.status)).reverse().slice(0, 12);

  return (
    <div className="space-y-6">
      <PageHeader title="Solicitações" description="Receber → conferir requisitos → verificar disponibilidade → separar → informar o paciente → concluir." />
      {rows.length === 0 ? (
        <Card><EmptyState icon={Inbox} title="Nenhuma solicitação ainda" description="Pacientes podem enviar solicitações quando sua farmácia aparece na busca." /></Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            {COLUMNS.map((col) => {
              const list = rows.filter((r) => col.statuses.includes(r.status));
              return (
                <section key={col.title} className="rounded-[1.5rem] bg-surface-sunken/60 p-3" aria-label={col.title}>
                  <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">{col.title}<span className="rounded-full bg-surface px-2 text-caption text-muted-foreground">{list.length}</span></h2>
                  <div className="space-y-3">
                    {list.map((r) => <RequestCard key={r.id} request={r} />)}
                    {list.length === 0 ? <p className="px-1 py-4 text-center text-caption text-muted-foreground">Vazio</p> : null}
                  </div>
                </section>
              );
            })}
          </div>
          {closed.length ? (
            <section>
              <h2 className="mb-3 text-h3 font-semibold">Encerradas recentemente</h2>
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border text-sm">
                  {closed.map((r) => (
                    <li key={r.id} className="flex justify-between px-5 py-3"><span>{r.patient_name}</span><span className="text-muted-foreground">{PHARMACY_REQUEST_STATUS[r.status].label}</span></li>
                  ))}
                </ul>
              </Card>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
