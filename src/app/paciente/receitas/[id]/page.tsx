import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Info, Printer, QrCode } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { isEffectivelyValid, loadPrescription, qrSvg } from "@/server/queries/prescriptions";
import { PrescriptionItems, PrescriptionMeta, SignatureNotice } from "@/components/prescriptions/prescription-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CopyCode } from "@/components/prescriptions/copy-code";
import { PRESCRIPTION_KIND } from "@/lib/labels";
import { fmt, todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Receita" };

export default async function PrescriptionDetail({ params }: PageProps<"/paciente/receitas/[id]">) {
  await requireRole("patient");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const rx = await loadPrescription(id);
  if (!rx) notFound();
  const valid = isEffectivelyValid(rx, todayISO());
  const svg = valid && rx.verification_code ? await qrSvg(rx.verification_code) : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/paciente/receitas"><ArrowLeft /> Receitas</Link></Button>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Receita digital</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <PrescriptionMeta rx={rx} />
              <SignatureNotice rx={rx} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Medicamentos prescritos</CardTitle></CardHeader>
            <CardContent><PrescriptionItems rx={rx} /></CardContent>
          </Card>
          {rx.dispensations.length ? (
            <Card>
              <CardHeader><CardTitle>Dispensações</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y divide-border text-sm">
                  {rx.dispensations.map((d) => (
                    <li key={d.id} className="flex items-center justify-between py-3">
                      <span className="flex items-center gap-2"><Building2 className="size-4 text-primary" /> {d.pharmacy?.trade_name}</span>
                      <span className="text-muted-foreground">{fmt.dateTime(d.dispensed_at)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
        <aside className="space-y-6">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2"><QrCode className="size-5 text-primary" /> QR Code da receita</CardTitle>
                <CardDescription>Mostre na farmácia. Somente farmácias verificadas conseguem consultar.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {svg ? (
                <>
                  <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-border bg-white p-3" role="img" aria-label="QR Code de verificação da receita" dangerouslySetInnerHTML={{ __html: svg }} />
                  <CopyCode code={rx.verification_code!} />
                  <p className="flex gap-2 text-caption text-muted-foreground"><Info className="size-4 shrink-0" /> O QR Code não contém seus dados de saúde. Não compartilhe em redes sociais.</p>
                </>
              ) : (
                <Alert tone="info">O QR Code fica disponível apenas para receitas emitidas e dentro da validade.</Alert>
              )}
              <div className="grid gap-2">
                {valid ? (
                  <Button asChild><Link href={`/paciente/farmacias?receita=${rx.id}`}><Building2 /> Enviar para uma farmácia</Link></Button>
                ) : null}
                <Button asChild variant="secondary"><Link href={`/receita/${rx.id}/imprimir`} target="_blank"><Printer /> Imprimir / salvar PDF</Link></Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Requisitos de dispensação</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{PRESCRIPTION_KIND[rx.kind].requirement}</p>
              <p className="mt-3 text-caption text-subtle-foreground">Leve um documento com foto. A farmácia pode exigir conferências adicionais.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
