import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { isEffectivelyValid, loadPrescription, qrSvg } from "@/server/queries/prescriptions";
import { PRESCRIPTION_KIND, PRESCRIPTION_STATUS } from "@/lib/labels";
import { fmt, todayISO } from "@/lib/format";
import { LogoMark } from "@/components/shared/logo";
import { PrintButton } from "@/components/prescriptions/print-button";

export const metadata: Metadata = { title: "Imprimir receita", robots: { index: false } };

/** Versão para impressão. O acesso segue as mesmas regras (RLS) da receita. */
export default async function PrintPrescription({ params }: PageProps<"/receita/[id]/imprimir">) {
  await requireSession();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const rx = await loadPrescription(id);
  if (!rx || rx.status === "draft") notFound();
  const valid = isEffectivelyValid(rx, todayISO());
  const svg = valid && rx.verification_code ? await qrSvg(rx.verification_code) : null;
  const status = rx.status === "issued" && !valid ? "expired" : rx.status;

  return (
    <main className="mx-auto max-w-[800px] bg-white p-8 text-[#2f2a33] print:p-0">
      <div className="no-print mb-6 flex justify-end"><PrintButton /></div>
      <header className="flex items-start justify-between border-b border-[#e6e2ea] pb-5">
        <div className="flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="text-lg font-semibold">Receita digital</p>
            <p className="text-sm text-[#6f6f6f]">{PRESCRIPTION_KIND[rx.kind].label} · {PRESCRIPTION_STATUS[status].label}</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{rx.doctor.profile.full_name}</p>
          <p>CRM {rx.doctor.crm}/{rx.doctor.crm_state}</p>
          <p className="text-[#6f6f6f]">{rx.doctor.specialty}</p>
        </div>
      </header>
      <section className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <p><span className="text-[#6f6f6f]">Paciente:</span> <strong>{rx.patient?.profile.full_name}</strong></p>
        <p><span className="text-[#6f6f6f]">Nascimento:</span> {fmt.date(rx.patient?.birth_date)}</p>
        <p><span className="text-[#6f6f6f]">Emissão:</span> {fmt.dateTime(rx.issued_at)}</p>
        <p><span className="text-[#6f6f6f]">Validade:</span> {fmt.date(rx.valid_until)}</p>
      </section>
      <ol className="mt-6 space-y-4">
        {rx.prescription_items.map((i, n) => (
          <li key={i.id} className="border-b border-dashed border-[#e6e2ea] pb-4">
            <p className="font-semibold">{n + 1}. {i.medication_name} {i.presentation ? `— ${i.presentation}` : ""}</p>
            <p className="text-sm">{i.dosage} · {i.frequency} · {i.continuous_use ? "uso contínuo" : i.duration_days ? `${i.duration_days} dias` : ""}{i.quantity ? ` · Qtd.: ${i.quantity}` : ""}</p>
            {i.instructions ? <p className="mt-1 text-sm text-[#4f4f4f]">{i.instructions}</p> : null}
          </li>
        ))}
      </ol>
      {rx.general_instructions ? <p className="mt-5 text-sm whitespace-pre-line"><strong>Orientações:</strong> {rx.general_instructions}</p> : null}
      <footer className="mt-8 flex items-end justify-between gap-6 border-t border-[#e6e2ea] pt-5">
        <div className="max-w-md space-y-2 text-xs text-[#4f4f4f]">
          <p>Hash de integridade (SHA-256): <span className="font-mono break-all">{rx.content_hash}</span></p>
          {rx.signature_legally_valid ? (
            <p>Assinado digitalmente via {rx.signature_provider} em {fmt.dateTime(rx.signed_at)}.</p>
          ) : (
            <p className="font-semibold text-[#a3262d]">
              DOCUMENTO SEM VALIDADE JURÍDICA — sem assinatura digital ICP-Brasil (ambiente de desenvolvimento). Não utilizar para dispensação.
            </p>
          )}
          <p>A verificação do QR Code requer acesso de farmácia autorizada no Genvity.</p>
        </div>
        {svg ? <div className="w-32 shrink-0" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      </footer>
    </main>
  );
}
