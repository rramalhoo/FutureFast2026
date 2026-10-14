"use client";

import * as React from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { BadgeCheck, CircleCheck, CircleX, ClipboardCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { dispenseAction, type VerifiedPrescription } from "@/server/actions/pharmacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PRESCRIPTION_KIND, PRESCRIPTION_STATUS } from "@/lib/labels";
import { fmt, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

function Check({ ok, warn, label, detail }: { ok: boolean; warn?: boolean; label: string; detail?: string }) {
  const Icon = ok ? CircleCheck : warn ? TriangleAlert : CircleX;
  return (
    <li className={cn("flex items-start gap-3 rounded-xl px-3 py-2.5", ok ? "bg-success-soft text-success-foreground" : warn ? "bg-warning-soft text-warning-foreground" : "bg-danger-soft text-danger-foreground")}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {detail ? <span className="block text-caption opacity-90">{detail}</span> : null}
      </span>
    </li>
  );
}

export function VerificationResult({ result, code, requestId, defaultPharmacist, onDone }: { result: VerifiedPrescription; code: string; requestId?: string; defaultPharmacist?: { name: string; crf: string }; onDone?: () => void }) {
  const [name, setName] = React.useState(defaultPharmacist?.name ?? "");
  const [crf, setCrf] = React.useState(defaultPharmacist?.crf ?? "");
  const [notes, setNotes] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const validDate = result.valid_until >= todayISO();
  const dispensable = result.status === "issued" && validDate && result.integrity_ok;

  async function dispense() {
    setBusy(true);
    const r = await dispenseAction({ code, pharmacistName: name, pharmacistCrf: crf, notes, requestId, confirmChecks: checked as true });
    setBusy(false);
    if (r.ok) {
      toast.success(r.message);
      setDone(true);
      onDone?.();
    } else toast.error(r.error);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="surface-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={PRESCRIPTION_STATUS[result.status].tone} dot>{PRESCRIPTION_STATUS[result.status].label}</Badge>
              <Badge tone="outline">{PRESCRIPTION_KIND[result.kind].label}</Badge>
            </div>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-caption text-muted-foreground">Paciente</dt>
                <dd className="font-semibold text-foreground-strong">{result.patient.name}</dd>
                <dd className="text-caption text-muted-foreground">Nascimento: {fmt.date(result.patient.birth_date)}</dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">Prescritor</dt>
                <dd className="flex items-center gap-1.5 font-semibold text-foreground-strong">{result.doctor.name} <BadgeCheck className="size-4 text-success" aria-label="Verificado" /></dd>
                <dd className="text-caption text-muted-foreground">CRM {result.doctor.crm}/{result.doctor.crm_state} · {result.doctor.specialty}</dd>
              </div>
              <div><dt className="text-caption text-muted-foreground">Emissão</dt><dd className="font-medium text-foreground-strong">{fmt.dateTime(result.issued_at)}</dd></div>
              <div><dt className="text-caption text-muted-foreground">Validade</dt><dd className="font-medium text-foreground-strong">{fmt.date(result.valid_until)}</dd></div>
            </dl>
          </div>
          <div className="surface-card p-5">
            <h3 className="mb-3 font-semibold">Medicamentos</h3>
            <ol className="space-y-3">
              {result.items.map((i, idx) => (
                <li key={idx} className="rounded-xl border border-border p-3 text-sm">
                  <p className="font-semibold text-foreground-strong">{idx + 1}. {i.medication_name}{i.presentation ? <span className="font-normal text-muted-foreground"> · {i.presentation}</span> : null}</p>
                  <p className="mt-1">{i.dosage} · {i.frequency} · {i.continuous_use ? "uso contínuo" : i.duration_days ? `${i.duration_days} dias` : "—"}{i.quantity ? ` · Qtd.: ${i.quantity}` : ""}</p>
                  {i.instructions ? <p className="mt-1 text-muted-foreground">{i.instructions}</p> : null}
                </li>
              ))}
            </ol>
            {result.general_instructions ? <p className="mt-3 text-sm"><span className="text-muted-foreground">Orientações:</span> {result.general_instructions}</p> : null}
          </div>
        </div>
        <aside className="space-y-4">
          <div className="surface-card p-5">
            <h3 className="mb-3 font-semibold">Verificações automáticas</h3>
            <ul className="space-y-2">
              <Check ok={result.integrity_ok} label={result.integrity_ok ? "Integridade conferida" : "Integridade NÃO confere"} detail="Hash SHA-256 do conteúdo emitido" />
              <Check ok={result.status === "issued"} label={`Situação: ${PRESCRIPTION_STATUS[result.status].label}`} />
              <Check ok={validDate} label={validDate ? "Dentro da validade" : "Fora da validade"} detail={`Até ${fmt.date(result.valid_until)}`} />
              <Check ok={result.signature_legally_valid} warn={!result.signature_legally_valid} label={result.signature_legally_valid ? "Assinatura digital qualificada" : "Sem assinatura com validade jurídica"} detail={result.signature_provider ?? undefined} />
              <Check ok label="Prescritor com CRM verificado na plataforma" />
            </ul>
          </div>
          <Alert tone="info" icon={ClipboardCheck} title="Conferência farmacêutica">
            {PRESCRIPTION_KIND[result.kind].requirement} A verificação automática não substitui a conferência e as exigências legais.
          </Alert>
          {result.dispensations.length ? (
            <Alert tone="warning" title="Dispensação já registrada">
              {result.dispensations.map((d) => `${d.pharmacy} · ${fmt.dateTime(d.dispensed_at)}`).join(" | ")}
            </Alert>
          ) : null}
        </aside>
      </div>

      {dispensable && !done ? (
        <div className="surface-card space-y-4 p-5">
          <h3 className="font-semibold">Registrar conclusão operacional</h3>
          {!result.signature_legally_valid ? (
            <Alert tone="danger" icon={ShieldAlert}>Receita sem assinatura com validade jurídica: em produção, a dispensação é bloqueada. Este ambiente permite o registro apenas para testes do fluxo.</Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Farmacêutico(a) responsável" htmlFor="ph-name" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="CRF" htmlFor="ph-crf" required><Input value={crf} onChange={(e) => setCrf(e.target.value)} placeholder="CRF-UF 00000" /></Field>
          </div>
          <Field label="Observações" htmlFor="ph-notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <label className="flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>Realizei a conferência farmacêutica (identidade do paciente, prescrição, prescritor e exigências legais aplicáveis) e assumo a responsabilidade técnica pela dispensação.</span>
          </label>
          <div className="flex justify-end">
            <Button size="lg" loading={busy} disabled={!checked || name.trim().length < 2 || crf.trim().length < 3} onClick={dispense}>Registrar dispensação</Button>
          </div>
        </div>
      ) : null}
      {done ? <Alert tone="success" title="Dispensação registrada">O paciente foi notificado e a receita foi marcada como dispensada.</Alert> : null}
    </motion.div>
  );
}
