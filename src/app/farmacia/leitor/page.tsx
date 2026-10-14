import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { loadMyPharmacy } from "@/server/queries/pharmacy";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { PrescriptionLookup } from "@/components/pharmacy/prescription-lookup";

export const metadata: Metadata = { title: "Leitor QR Code" };

export default async function ScannerPage() {
  const session = await requireRole("pharmacy");
  const pharmacy = await loadMyPharmacy(session.userId);
  const approved = pharmacy?.verification_status === "approved";
  return (
    <div className="space-y-6">
      <PageHeader title="Leitor de receitas" description="Leia o QR Code ou digite o código para verificar a receita." />
      {approved ? (
        <PrescriptionLookup withCamera defaultPharmacist={pharmacy ? { name: pharmacy.technical_responsible, crf: pharmacy.technical_responsible_crf } : undefined} />
      ) : (
        <Alert tone="warning">A consulta de receitas é liberada após a verificação cadastral da farmácia.</Alert>
      )}
    </div>
  );
}
