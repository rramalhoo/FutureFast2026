"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Ban, FileSignature, Pencil, Send, ShieldAlert, Trash2, Undo2 } from "lucide-react";
import { cancelPrescriptionAction, deleteDraftAction, returnToDraftAction, signAndIssueAction, submitForSignatureAction } from "@/server/actions/doctor";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "draft", label: "Rascunho" },
  { key: "pending_signature", label: "Aguardando assinatura" },
  { key: "issued", label: "Emitida" },
];

export function PrescriptionStepper({ status }: { status: string }) {
  const index = status === "draft" ? 0 : status === "pending_signature" ? 1 : 2;
  const terminal = ["cancelled", "expired"].includes(status);
  return (
    <ol className="flex items-center gap-2" aria-label="Etapas da prescrição">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex flex-1 items-center gap-2" aria-current={i === index ? "step" : undefined}>
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", i <= index && !terminal ? "bg-primary text-primary-foreground" : "bg-surface-sunken text-muted-foreground")}>{i + 1}</span>
          <span className={cn("hidden text-sm font-medium sm:block", i <= index && !terminal ? "text-foreground-strong" : "text-muted-foreground")}>{s.label}</span>
          {i < STEPS.length - 1 ? <span className={cn("h-0.5 flex-1 rounded-full", i < index && !terminal ? "bg-primary" : "bg-border")} /> : null}
        </li>
      ))}
    </ol>
  );
}

export function PrescriptionWorkflow({
  id,
  status,
  contentHash,
  signature,
}: {
  id: string;
  status: string;
  contentHash: string | null;
  signature: { available: boolean; label: string; legallyValid: boolean; unavailableReason?: string };
}) {
  const [confirmed, setConfirmed] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");

  async function run(key: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setBusy(key);
    const r = await fn();
    setBusy(null);
    if (r.ok) {
      if (r.message) toast.success(r.message);
    } else toast.error(r.error);
    return r.ok;
  }

  const cancelDialog = (
    <ConfirmDialog
      tone="danger"
      title="Cancelar prescrição?"
      description="Prescrições não podem ser editadas após emitidas. O cancelamento é registrado e o paciente é notificado."
      confirmLabel="Cancelar prescrição"
      onConfirm={async () => (await run("cancel", () => cancelPrescriptionAction(id, reason))) || false}
      trigger={<Button variant="danger-soft"><Ban /> Cancelar prescrição</Button>}
    >
      <label htmlFor="cancel-reason" className="text-sm font-medium">Motivo (obrigatório)</label>
      <Textarea id="cancel-reason" className="mt-1.5" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
    </ConfirmDialog>
  );

  if (status === "draft") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Revise os itens. Ao enviar para assinatura, o conteúdo é selado com um hash de integridade e não pode mais ser editado (a menos que volte para rascunho antes da assinatura).</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link href={`/medico/prescricoes/${id}/editar`}><Pencil /> Editar</Link></Button>
          <Button loading={busy === "submit"} onClick={() => run("submit", () => submitForSignatureAction(id))}><Send /> Revisar e enviar para assinatura</Button>
          <ConfirmDialog tone="danger" title="Excluir rascunho?" confirmLabel="Excluir" onConfirm={async () => { await deleteDraftAction(id); }} trigger={<Button variant="ghost" className="text-danger-foreground"><Trash2 /> Excluir</Button>} />
        </div>
      </div>
    );
  }

  if (status === "pending_signature") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <p className="text-caption text-muted-foreground">Hash de integridade (SHA-256) a ser assinado</p>
          <p className="mt-1 font-mono text-xs break-all text-foreground-strong">{contentHash}</p>
        </div>
        {!signature.available ? (
          <Alert tone="warning" icon={ShieldAlert} title="Assinatura indisponível">{signature.unavailableReason}</Alert>
        ) : !signature.legallyValid ? (
          <Alert tone="danger" icon={ShieldAlert} title={signature.label}>
            Este ambiente usa um selo de desenvolvimento. A receita será emitida para testes do fluxo, mas <strong>sem validade jurídica</strong>, e assim identificada ao paciente e à farmácia.
          </Alert>
        ) : (
          <Alert tone="success" title={`Provedor: ${signature.label}`}>Assinatura digital qualificada.</Alert>
        )}
        <label className="flex items-start gap-3 rounded-2xl border border-border p-4 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--primary)]" />
          <span>Revisei paciente, medicamentos, doses, frequências, duração e orientações. Assumo a responsabilidade técnica por esta prescrição.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button disabled={!confirmed || !signature.available} loading={busy === "sign"} onClick={() => run("sign", () => signAndIssueAction(id, confirmed))}><FileSignature /> Assinar e emitir</Button>
          <Button variant="secondary" loading={busy === "back"} onClick={() => run("back", () => returnToDraftAction(id))}><Undo2 /> Voltar para rascunho</Button>
          {cancelDialog}
        </div>
      </div>
    );
  }

  if (status === "issued") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary"><Link href={`/receita/${id}/imprimir`} target="_blank">Imprimir</Link></Button>
        {cancelDialog}
      </div>
    );
  }
  return null;
}
