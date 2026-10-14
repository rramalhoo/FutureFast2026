"use client";

import * as React from "react";
import { toast } from "sonner";
import { Ban, Check, FileText, RotateCcw, X } from "lucide-react";
import {
  recordPaymentAction,
  resolveDsrAction,
  respondTicketAction,
  reviewVerificationAction,
  setSubscriptionStatusAction,
  setUserSuspendedAction,
  updatePlanAction,
  updateSettingAction,
  verificationDocumentUrlAction,
} from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/lib/supabase/types";
import { DSR_STATUS, SUBSCRIPTION_STATUS, TICKET_STATUS } from "@/lib/labels";

function useRun() {
  const [busy, setBusy] = React.useState(false);
  return {
    busy,
    async run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
      setBusy(true);
      const r = await fn();
      setBusy(false);
      if (r.ok) {
        if (r.message) toast.success(r.message);
      } else toast.error(r.error);
      return r.ok;
    },
  };
}

export function DocumentLinks({ paths }: { paths: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {paths.map((p, i) => (
        <Button
          key={p}
          size="sm"
          variant="secondary"
          onClick={async () => {
            const r = await verificationDocumentUrlAction(p);
            if (r.ok && r.data) window.open(r.data.url, "_blank", "noopener,noreferrer");
            else if (!r.ok) toast.error(r.error);
          }}
        >
          <FileText /> Documento {i + 1}
        </Button>
      ))}
    </div>
  );
}

export function VerificationReview({ requestId }: { requestId: string }) {
  const { busy, run } = useRun();
  const [notes, setNotes] = React.useState("");
  return (
    <div className="space-y-2">
      <Textarea rows={2} aria-label="Observações da análise" placeholder="Observações (obrigatório para recusa)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <ConfirmDialog
          title="Aprovar cadastro?"
          description="Confirme que os documentos foram conferidos junto ao conselho/órgão competente. A decisão fica registrada na auditoria."
          confirmLabel="Aprovar"
          onConfirm={async () => (await run(() => reviewVerificationAction(requestId, true, notes))) || false}
          trigger={<Button variant="success" size="sm" disabled={busy}><Check /> Aprovar</Button>}
        />
        <Button variant="danger-soft" size="sm" loading={busy} disabled={notes.trim().length < 5} onClick={() => run(() => reviewVerificationAction(requestId, false, notes))}><X /> Recusar</Button>
      </div>
    </div>
  );
}

export function SuspendButton({ userId, suspended, name }: { userId: string; suspended: boolean; name: string }) {
  const { run } = useRun();
  return suspended ? (
    <Button size="sm" variant="secondary" onClick={() => run(() => setUserSuspendedAction(userId, false))}><RotateCcw /> Reativar</Button>
  ) : (
    <ConfirmDialog
      tone="danger"
      title={`Suspender ${name}?`}
      description="O usuário não conseguirá entrar até ser reativado. Sessões ativas expiram na próxima renovação."
      confirmLabel="Suspender"
      onConfirm={async () => (await run(() => setUserSuspendedAction(userId, true))) || false}
      trigger={<Button size="sm" variant="ghost" className="text-danger-foreground"><Ban /> Suspender</Button>}
    />
  );
}

export function SubscriptionControls({ id, status, amountCents }: { id: string; status: Tables<"subscriptions">["status"]; amountCents: number }) {
  const { busy, run } = useRun();
  const [amount, setAmount] = React.useState(String(amountCents / 100));
  const [payOpen, setPayOpen] = React.useState(false);
  const [payStatus, setPayStatus] = React.useState<"paid" | "pending" | "failed" | "refunded">("paid");
  const [ref, setRef] = React.useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Status da assinatura"
        className="h-9 w-48"
        value={status}
        disabled={busy}
        onChange={(e) => run(() => setSubscriptionStatusAction(id, e.target.value as typeof status, Math.round(Number(amount) * 100)))}
      >
        {Object.entries(SUBSCRIPTION_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
      </NativeSelect>
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogTrigger asChild><Button size="sm" variant="secondary">Registrar pagamento</Button></DialogTrigger>
        <DialogContent title="Registrar pagamento manual" description="Use apenas para pagamentos recebidos fora da plataforma (sem gateway integrado).">
          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm font-medium">Valor (R$)<Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label className="block space-y-1.5 text-sm font-medium">Status
              <NativeSelect value={payStatus} onChange={(e) => setPayStatus(e.target.value as typeof payStatus)}>
                <option value="paid">Pago</option><option value="pending">Pendente</option><option value="failed">Falhou</option><option value="refunded">Estornado</option>
              </NativeSelect>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">Referência (nota fiscal, comprovante)<Input value={ref} onChange={(e) => setRef(e.target.value)} /></label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPayOpen(false)}>Cancelar</Button>
              <Button loading={busy} onClick={async () => { if (await run(() => recordPaymentAction({ subscriptionId: id, amountCents: Math.round(Number(amount) * 100), status: payStatus, reference: ref }))) setPayOpen(false); }}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PlanEditor({ plan }: { plan: Tables<"plans"> }) {
  const { busy, run } = useRun();
  const [min, setMin] = React.useState(plan.price_min_cents != null ? String(plan.price_min_cents / 100) : "");
  const [max, setMax] = React.useState(plan.price_max_cents != null ? String(plan.price_max_cents / 100) : "");
  const [active, setActive] = React.useState(plan.is_active);
  const [desc, setDesc] = React.useState(plan.description);
  const toCents = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));
  return (
    <div className="grid gap-3 rounded-2xl border border-border p-4 lg:grid-cols-[1.2fr_120px_120px_2fr_auto_auto] lg:items-end">
      <div><p className="font-semibold text-foreground-strong">{plan.name}</p><p className="text-caption text-muted-foreground">{plan.slug}{plan.custom_pricing ? " · preço personalizado" : ""}</p></div>
      <label className="space-y-1 text-caption font-medium">Mín. (R$)<Input value={min} onChange={(e) => setMin(e.target.value)} inputMode="decimal" className="h-9" disabled={plan.custom_pricing} /></label>
      <label className="space-y-1 text-caption font-medium">Máx. (R$)<Input value={max} onChange={(e) => setMax(e.target.value)} inputMode="decimal" className="h-9" disabled={plan.custom_pricing} /></label>
      <label className="space-y-1 text-caption font-medium">Descrição<Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-9" /></label>
      <label className="flex h-9 items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} /> Ativo</label>
      <Button size="sm" loading={busy} onClick={() => run(() => updatePlanAction({ id: plan.id, priceMinCents: toCents(min), priceMaxCents: toCents(max), isActive: active, description: desc }))}>Salvar</Button>
    </div>
  );
}

export function TicketResponder({ id, status, response }: { id: string; status: Tables<"support_tickets">["status"]; response: string | null }) {
  const { busy, run } = useRun();
  const [text, setText] = React.useState(response ?? "");
  const [s, setS] = React.useState(status);
  return (
    <div className="space-y-2">
      <Textarea rows={3} aria-label="Resposta" value={text} onChange={(e) => setText(e.target.value)} placeholder="Resposta ao usuário" />
      <div className="flex gap-2">
        <NativeSelect aria-label="Status" className="h-9" value={s} onChange={(e) => setS(e.target.value as typeof s)}>
          {Object.entries(TICKET_STATUS).map(([v, t]) => <option key={v} value={v}>{t.label}</option>)}
        </NativeSelect>
        <Button size="sm" className="h-9" loading={busy} onClick={() => run(() => respondTicketAction(id, s, text))}>Enviar</Button>
      </div>
    </div>
  );
}

export function DsrResolver({ id, status, notes }: { id: string; status: Tables<"data_subject_requests">["status"]; notes: string | null }) {
  const { busy, run } = useRun();
  const [text, setText] = React.useState(notes ?? "");
  const [s, setS] = React.useState(status);
  return (
    <div className="space-y-2">
      <Textarea rows={2} aria-label="Notas de resolução" value={text} onChange={(e) => setText(e.target.value)} placeholder="Notas para o titular" />
      <div className="flex gap-2">
        <NativeSelect aria-label="Status" className="h-9" value={s} onChange={(e) => setS(e.target.value as typeof s)}>
          {Object.entries(DSR_STATUS).map(([v, t]) => <option key={v} value={v}>{t.label}</option>)}
        </NativeSelect>
        <Button size="sm" className="h-9" loading={busy} onClick={() => run(() => resolveDsrAction(id, s, text))}>Atualizar</Button>
      </div>
    </div>
  );
}

export function SettingEditor({ setting }: { setting: Tables<"platform_settings"> }) {
  const { busy, run } = useRun();
  const [raw, setRaw] = React.useState(JSON.stringify(setting.value, null, 2));
  const isBool = typeof setting.value === "boolean";
  return (
    <div className="space-y-2 rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-mono text-sm font-semibold text-foreground-strong">{setting.key}</p><p className="text-caption text-muted-foreground">{setting.description}</p></div>
        {isBool ? <Switch checked={raw === "true"} aria-label={setting.key} onCheckedChange={(v) => { setRaw(String(v)); void run(() => updateSettingAction(setting.key, v)); }} /> : null}
      </div>
      {!isBool ? (
        <>
          <Textarea rows={3} aria-label={`Valor de ${setting.key}`} className="font-mono text-xs" value={raw} onChange={(e) => setRaw(e.target.value)} />
          <div className="flex justify-end">
            <Button size="sm" loading={busy} onClick={() => { try { const v = JSON.parse(raw); void run(() => updateSettingAction(setting.key, v)); } catch { toast.error("JSON inválido."); } }}>Salvar</Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
