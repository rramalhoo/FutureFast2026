import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentLinks, VerificationReview } from "@/components/admin/admin-controls";
import { VERIFICATION } from "@/lib/labels";
import { fmt } from "@/lib/format";
import { nameOf } from "@/server/queries/patient";

export const metadata: Metadata = { title: "Verificações" };

export default async function VerificationsPage() {
  await requireRole("admin");
  const supabase = await getServerSupabase();
  const { data: requests } = await supabase
    .from("verification_requests")
    .select("*, submitter:profiles!verification_requests_submitted_by_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  const reqs = requests ?? [];
  const doctorIds = reqs.filter((r) => r.subject_type === "doctor").map((r) => r.subject_id);
  const pharmacyIds = reqs.filter((r) => r.subject_type === "pharmacy").map((r) => r.subject_id);
  const [{ data: doctors }, { data: pharmacies }] = await Promise.all([
    doctorIds.length ? supabase.from("doctors").select("id, crm, crm_state, specialty, rqe, city, state").in("id", doctorIds) : Promise.resolve({ data: [] }),
    pharmacyIds.length ? supabase.from("pharmacies").select("id, trade_name, legal_name, cnpj, afe_number, technical_responsible, technical_responsible_crf, city, state").in("id", pharmacyIds) : Promise.resolve({ data: [] }),
  ]);
  const pending = reqs.filter((r) => r.status === "under_review");
  const done = reqs.filter((r) => r.status !== "under_review");

  const Details = ({ r }: { r: (typeof reqs)[number] }) => {
    if (r.subject_type === "doctor") {
      const d = doctors?.find((x) => x.id === r.subject_id);
      return d ? <p className="text-sm">CRM <strong>{d.crm}/{d.crm_state}</strong> · {d.specialty}{d.rqe ? ` · RQE ${d.rqe}` : ""} · {d.city}/{d.state}</p> : null;
    }
    const p = pharmacies?.find((x) => x.id === r.subject_id);
    return p ? <p className="text-sm"><strong>{p.trade_name}</strong> ({p.legal_name}) · CNPJ {fmt.cnpj(p.cnpj)} · AFE {p.afe_number} · RT {p.technical_responsible} ({p.technical_responsible_crf}) · {p.city}/{p.state}</p> : null;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Verificações" description="Profissionais e farmácias aguardando conferência documental." />
      <Alert tone="info">Confira o CRM no portal do conselho regional e a AFE/CNPJ nos órgãos competentes antes de aprovar. Toda decisão é auditada.</Alert>
      {pending.length === 0 ? (
        <Card><EmptyState icon={BadgeCheck} title="Nenhuma verificação pendente" /></Card>
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <Card key={r.id}>
              <CardContent className="grid gap-4 pt-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{r.subject_type === "doctor" ? "Médico(a)" : "Farmácia"}</Badge>
                    <span className="font-semibold text-foreground-strong">{nameOf(r.submitter)}</span>
                    <span className="text-caption text-muted-foreground">enviado {fmt.relative(r.created_at)}</span>
                  </div>
                  <Details r={r} />
                  <DocumentLinks paths={r.document_paths} />
                </div>
                <VerificationReview requestId={r.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {done.length ? (
        <section>
          <h2 className="mb-3 text-h3 font-semibold">Histórico</h2>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border text-sm">
              {done.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <span>{nameOf(r.submitter)} · {r.subject_type === "doctor" ? "Médico(a)" : "Farmácia"} · {fmt.date(r.reviewed_at)}{r.reviewer_notes ? ` · ${r.reviewer_notes}` : ""}</span>
                  <Badge tone={VERIFICATION[r.status].tone}>{VERIFICATION[r.status].label}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
