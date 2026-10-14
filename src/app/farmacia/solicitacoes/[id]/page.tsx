import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, QrCode } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadPrescription } from "@/server/queries/prescriptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PrescriptionItems, PrescriptionMeta, SignatureNotice } from "@/components/prescriptions/prescription-view";

export const metadata: Metadata = { title: "Receita da solicitação" };

/** Visualização autorizada pelo paciente ao enviar a solicitação. */
export default async function RequestPrescription({ params }: PageProps<"/farmacia/solicitacoes/[id]">) {
  await requireRole("pharmacy");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await getServerSupabase();
  const { data: req } = await supabase.from("pharmacy_requests").select("prescription_id").eq("id", id).maybeSingle();
  if (!req?.prescription_id) notFound();
  const rx = await loadPrescription(req.prescription_id);
  if (!rx) notFound();
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/farmacia/solicitacoes"><ArrowLeft /> Solicitações</Link></Button>
      <Alert tone="info" icon={QrCode} title="Pré-conferência">
        Use esta visualização para separar os produtos. A dispensação é registrada somente com o QR Code ou código apresentado pelo paciente na retirada.
      </Alert>
      <Card>
        <CardHeader><CardTitle>Receita anexada</CardTitle></CardHeader>
        <CardContent className="space-y-6"><PrescriptionMeta rx={rx} /><SignatureNotice rx={rx} /><PrescriptionItems rx={rx} /></CardContent>
      </Card>
    </div>
  );
}
