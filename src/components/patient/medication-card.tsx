"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BellOff, CalendarRange, Clock, Ellipsis, FileText, History, Pause, Pencil, Play, Square, Trash2 } from "lucide-react";
import type { Tables } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TimesEditor } from "@/components/shared/times-editor";
import { deletePersonalMedicationAction, setMedicationStatusAction, updateMedicationScheduleAction } from "@/server/actions/patient";
import { MEDICATION_STATUS } from "@/lib/labels";
import { fmt } from "@/lib/format";

type Med = Tables<"patient_medications">;
type Log = { scheduled_for: string; status: "taken" | "skipped" };

export function MedicationCard({ med, logs }: { med: Med; logs: Log[] }) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [times, setTimes] = React.useState(med.schedule_times.map((t) => t.slice(0, 5)));
  const [reminders, setReminders] = React.useState(med.reminders_enabled);
  const [saving, setSaving] = React.useState(false);
  const status = MEDICATION_STATUS[med.status];
  const prescribed = med.source === "prescription";

  async function changeStatus(s: "active" | "paused" | "completed") {
    const r = await setMedicationStatusAction(med.id, s);
    if (r.ok) toast.success(r.message);
    else toast.error(r.error);
  }

  return (
    <article className="surface-card flex flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-h3 font-semibold">{med.name}</h3>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          {med.presentation ? <p className="mt-0.5 text-sm text-muted-foreground">{med.presentation}</p> : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Ações para ${med.name}`}>
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}><Pencil /> Horários dos lembretes</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setHistoryOpen(true)}><History /> Histórico de doses</DropdownMenuItem>
            {med.prescription_id ? (
              <DropdownMenuItem asChild><Link href={`/paciente/receitas/${med.prescription_id}`}><FileText /> Ver receita</Link></DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            {med.status === "active" ? <DropdownMenuItem onSelect={() => changeStatus("paused")}><Pause /> Pausar acompanhamento</DropdownMenuItem> : null}
            {med.status === "paused" ? <DropdownMenuItem onSelect={() => changeStatus("active")}><Play /> Retomar acompanhamento</DropdownMenuItem> : null}
            {med.status !== "completed" && med.status !== "discontinued" ? (
              <DropdownMenuItem onSelect={() => changeStatus("completed")}><Square /> Marcar como concluído</DropdownMenuItem>
            ) : null}
            {!prescribed ? (
              <DropdownMenuItem tone="danger" onSelect={() => setDeleteOpen(true)}><Trash2 /> Remover registro</DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-caption text-muted-foreground">Dose</dt>
          <dd className="font-medium text-foreground-strong">{med.dosage ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-caption text-muted-foreground">Frequência</dt>
          <dd className="font-medium text-foreground-strong">{med.frequency ?? "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="flex items-center gap-1 text-caption text-muted-foreground"><CalendarRange className="size-3.5" /> Período</dt>
          <dd className="font-medium text-foreground-strong">
            {fmt.date(med.start_date)} {med.end_date ? `até ${fmt.date(med.end_date)}` : "· uso contínuo / sem término definido"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {med.schedule_times.length ? (
          med.schedule_times.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-soft-foreground tabular">
              <Clock className="size-3" aria-hidden /> {t.slice(0, 5)}
            </span>
          ))
        ) : (
          <span className="text-caption text-muted-foreground">Sem horários definidos</span>
        )}
        {!med.reminders_enabled ? <span className="inline-flex items-center gap-1 text-caption text-muted-foreground"><BellOff className="size-3.5" /> Lembretes desativados</span> : null}
      </div>

      {med.instructions ? <p className="mt-4 rounded-xl bg-surface-muted p-3 text-sm leading-relaxed text-foreground">{med.instructions}</p> : null}

      <p className="mt-4 border-t border-border pt-3 text-caption text-muted-foreground">
        {prescribed ? "Prescrito pelo médico — dose e frequência só podem ser alteradas por ele." : "Registro pessoal — não substitui uma prescrição."}
      </p>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Horários dos lembretes" description={prescribed ? "Ajuste os horários de lembrete. A prescrição continua a mesma." : undefined}>
          <div className="space-y-5">
            <TimesEditor value={times} onChange={setTimes} />
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4 text-sm">
              <span className="font-medium text-foreground-strong">Receber lembretes no app</span>
              <Switch checked={reminders} onCheckedChange={setReminders} />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button
                loading={saving}
                onClick={async () => {
                  setSaving(true);
                  const r = await updateMedicationScheduleAction(med.id, times.filter(Boolean), reminders);
                  setSaving(false);
                  if (r.ok) {
                    toast.success(r.message);
                    setEditOpen(false);
                  } else toast.error(r.error);
                }}
              >
                Salvar horários
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent title={`Histórico — ${med.name}`} description="Registros dos últimos 30 dias.">
          {logs.length ? (
            <ul className="divide-y divide-border">
              {logs.map((l) => (
                <li key={l.scheduled_for} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-foreground-strong">{fmt.dateTime(l.scheduled_for)}</span>
                  <Badge tone={l.status === "taken" ? "success" : "neutral"}>{l.status === "taken" ? "Tomada" : "Pulada"}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum registro de dose ainda.</p>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tone="danger"
        title="Remover este registro?"
        description="O histórico de doses deste registro pessoal também será removido."
        confirmLabel="Remover"
        onConfirm={async () => {
          const r = await deletePersonalMedicationAction(med.id);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        }}
      />
    </article>
  );
}
