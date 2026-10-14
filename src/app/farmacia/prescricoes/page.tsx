import type { Metadata } from "next";
import { History, PackageCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadMyPharmacy } from "@/server/queries/pharmacy";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PrescriptionLookup } from "@/components/pharmacy/prescription-lookup";
import { nameOf } from "@/server/queries/patient";
import { fmt } from "@/lib/format";

export const metadata: Metadata = { title: "Prescrições" };

export default async function PharmacyPrescriptions() {
  const session = await requireRole("pharmacy");
  const pharmacy = await loadMyPharmacy(session.userId);
  const approved = pharmacy?.verification_status === "approved";
  const supabase = await getServerSupabase();
  const [dispensations, accesses] = await Promise.all([
    supabase.from("dispensations").select("id, dispensed_at, pharmacist_name, pharmacist_crf, signature_legally_valid, request_id").order("dispensed_at", { ascending: false }).limit(30),
    supabase.from("prescription_pharmacy_access").select("id, accessed_at, accessed_by, profile:profiles!prescription_pharmacy_access_accessed_by_fkey(full_name)").order("accessed_at", { ascending: false }).limit(30),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Prescrições" description="Consulte receitas pelo código e acompanhe o histórico de conferências." />
      {approved ? (
        <PrescriptionLookup defaultPharmacist={pharmacy ? { name: pharmacy.technical_responsible, crf: pharmacy.technical_responsible_crf } : undefined} />
      ) : (
        <Alert tone="warning">Disponível após a verificação da farmácia.</Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="size-5 text-primary" /> Dispensações registradas</CardTitle></CardHeader>
          <CardContent>
            {dispensations.data?.length ? (
              <ul className="divide-y divide-border text-sm">
                {dispensations.data.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span>{fmt.dateTime(d.dispensed_at)} · {d.pharmacist_name} ({d.pharmacist_crf})</span>
                    {!d.signature_legally_valid ? <Badge tone="warning">Sem validade jurídica</Badge> : <Badge tone="success">Assinada</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={PackageCheck} title="Nenhuma dispensação" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-5 text-primary" /> Consultas realizadas</CardTitle></CardHeader>
          <CardContent>
            {accesses.data?.length ? (
              <ul className="divide-y divide-border text-sm">
                {accesses.data.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                    <span>{fmt.dateTime(a.accessed_at)}</span>
                    <span className="text-muted-foreground">{nameOf(a.profile)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={History} title="Nenhuma consulta" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
