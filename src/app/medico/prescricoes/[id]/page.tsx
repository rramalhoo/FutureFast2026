import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { loadPrescription } from "@/server/queries/prescriptions";
import { getSignatureProvider } from "@/lib/signature";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PrescriptionItems, PrescriptionMeta, SignatureNotice } from "@/components/prescriptions/prescription-view";
import { PrescriptionStepper, PrescriptionWorkflow } from "@/components/doctor/prescription-workflow";
import { fmt } from "@/lib/format";

export const metadata: Metadata = { title: "Prescrição" };

export default async function DoctorPrescription({ params }: PageProps<"/medico/prescricoes/[id]">) {
  const session = await requireRole("doctor");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const rx = await loadPrescription(id);
  if (!rx || rx.doctor_id !== session.userId) notFound();
  const provider = getSignatureProvider();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/medico/prescricoes"><ArrowLeft /> Prescrições</Link></Button>
      <Card className="p-5"><PrescriptionStepper status={rx.status} /></Card>
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Prescrição</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <PrescriptionMeta rx={rx} />
              {rx.status !== "draft" && rx.status !== "pending_signature" ? <SignatureNotice rx={rx} /> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Itens</CardTitle></CardHeader>
            <CardContent><PrescriptionItems rx={rx} /></CardContent>
          </Card>
        </div>
        <aside className="space-y-6">
          <Card className="lg:sticky lg:top-24">
            <CardHeader><CardTitle>Próximos passos</CardTitle></CardHeader>
            <CardContent>
              <PrescriptionWorkflow
                id={rx.id}
                status={rx.status}
                contentHash={rx.content_hash}
                signature={{ available: provider.isAvailable(), label: provider.label, legallyValid: provider.legallyValid, unavailableReason: provider.unavailableReason }}
              />
              {rx.dispensations.length ? (
                <div className="mt-5 border-t border-border pt-4 text-sm">
                  <p className="font-medium text-foreground-strong">Dispensações</p>
                  {rx.dispensations.map((d) => <p key={d.id} className="text-muted-foreground">{d.pharmacy?.trade_name} · {fmt.dateTime(d.dispensed_at)}</p>)}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
