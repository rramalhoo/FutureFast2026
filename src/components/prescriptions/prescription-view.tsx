import { BadgeCheck, CircleAlert, ShieldCheck, ShieldOff } from "lucide-react";
import type { LoadedPrescription } from "@/server/queries/prescriptions";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { PRESCRIPTION_KIND, PRESCRIPTION_STATUS } from "@/lib/labels";
import { fmt, todayISO } from "@/lib/format";

export function effectiveStatus(rx: { status: LoadedPrescription["status"]; valid_until: string | null }) {
  return rx.status === "issued" && rx.valid_until && rx.valid_until < todayISO() ? "expired" : rx.status;
}

export function SignatureNotice({ rx }: { rx: LoadedPrescription }) {
  if (rx.status === "draft" || rx.status === "pending_signature") {
    return <Alert tone="warning" title="Ainda não emitida">Esta prescrição não foi assinada nem emitida.</Alert>;
  }
  if (rx.signature_legally_valid) {
    return (
      <Alert tone="success" icon={ShieldCheck} title="Assinatura digital qualificada">
        Assinada via {rx.signature_provider} em {fmt.dateTime(rx.signed_at)}.
      </Alert>
    );
  }
  return (
    <Alert tone="danger" icon={ShieldOff} title="Sem validade jurídica">
      Selo de integridade de ambiente de desenvolvimento ({rx.signature_provider}). Esta receita não possui assinatura
      digital ICP-Brasil e não deve ser usada para dispensação.
    </Alert>
  );
}

export function PrescriptionItems({ rx }: { rx: LoadedPrescription }) {
  return (
    <ol className="space-y-3">
      {rx.prescription_items.map((item, i) => (
        <li key={item.id} className="rounded-2xl border border-border p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-sm font-semibold text-primary-soft-foreground tabular">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground-strong">{item.medication_name}</p>
              {item.presentation ? <p className="text-sm text-muted-foreground">{item.presentation}</p> : null}
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div><dt className="text-caption text-muted-foreground">Dose</dt><dd className="font-medium text-foreground-strong">{item.dosage}</dd></div>
                <div><dt className="text-caption text-muted-foreground">Frequência</dt><dd className="font-medium text-foreground-strong">{item.frequency}</dd></div>
                <div><dt className="text-caption text-muted-foreground">Duração</dt><dd className="font-medium text-foreground-strong">{item.continuous_use ? "Uso contínuo" : item.duration_days ? `${item.duration_days} dias` : "—"}</dd></div>
                <div><dt className="text-caption text-muted-foreground">Quantidade</dt><dd className="font-medium text-foreground-strong">{item.quantity ?? "—"}</dd></div>
                {item.route ? <div><dt className="text-caption text-muted-foreground">Via</dt><dd className="font-medium text-foreground-strong">{item.route}</dd></div> : null}
              </dl>
              {item.instructions ? <p className="mt-3 rounded-xl bg-surface-muted p-3 text-sm">{item.instructions}</p> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PrescriptionMeta({ rx }: { rx: LoadedPrescription }) {
  const status = effectiveStatus(rx);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={PRESCRIPTION_STATUS[status].tone} dot>{PRESCRIPTION_STATUS[status].label}</Badge>
        <Badge tone="outline">{PRESCRIPTION_KIND[rx.kind].label}</Badge>
      </div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-caption text-muted-foreground">Médico(a) responsável</dt>
          <dd className="flex items-center gap-1.5 font-medium text-foreground-strong">
            {rx.doctor.profile.full_name} <BadgeCheck className="size-4 text-success" aria-label="Verificado" />
          </dd>
          <dd className="text-caption text-muted-foreground">CRM {rx.doctor.crm}/{rx.doctor.crm_state} · {rx.doctor.specialty}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Paciente</dt>
          <dd className="font-medium text-foreground-strong">{rx.patient?.profile.full_name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Emissão</dt>
          <dd className="font-medium text-foreground-strong">{rx.issued_at ? fmt.dateTime(rx.issued_at) : "Não emitida"}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Validade</dt>
          <dd className="font-medium text-foreground-strong">{fmt.date(rx.valid_until)}</dd>
        </div>
      </dl>
      {rx.status === "cancelled" ? (
        <Alert tone="danger" icon={CircleAlert} title={`Cancelada em ${fmt.dateTime(rx.cancelled_at)}`}>{rx.cancellation_reason}</Alert>
      ) : null}
      {rx.general_instructions ? (
        <div>
          <p className="text-caption text-muted-foreground">Orientações gerais</p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line">{rx.general_instructions}</p>
        </div>
      ) : null}
    </div>
  );
}
