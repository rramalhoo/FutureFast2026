"use client";

import * as React from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { Check, Clock, RotateCcw, SkipForward, X } from "lucide-react";
import { logDoseAction, undoDoseAction } from "@/server/actions/patient";
import type { ScheduledDose } from "@/lib/doses";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusStyles: Record<ScheduledDose["status"], { label: string; cls: string }> = {
  taken: { label: "Tomada", cls: "bg-success-soft text-success-foreground" },
  skipped: { label: "Pulada", cls: "bg-surface-sunken text-muted-foreground" },
  pending: { label: "Pendente", cls: "bg-primary-soft text-primary-soft-foreground" },
  missed: { label: "Sem registro", cls: "bg-warning-soft text-warning-foreground" },
};

export function useDoseActions() {
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  async function mark(dose: ScheduledDose, status: "taken" | "skipped") {
    setPendingKey(`${dose.medicationId}|${dose.scheduledFor}`);
    const r = await logDoseAction({ medicationId: dose.medicationId, scheduledFor: dose.scheduledFor, status });
    setPendingKey(null);
    if (r.ok) toast.success(r.message);
    else toast.error(r.error);
  }
  async function undo(dose: ScheduledDose) {
    setPendingKey(`${dose.medicationId}|${dose.scheduledFor}`);
    const r = await undoDoseAction(dose.medicationId, dose.scheduledFor);
    setPendingKey(null);
    if (!r.ok) toast.error(r.error);
  }
  return { pendingKey, mark, undo };
}

export function DoseList({ doses, compact }: { doses: ScheduledDose[]; compact?: boolean }) {
  const { pendingKey, mark, undo } = useDoseActions();
  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {doses.map((dose) => {
          const key = `${dose.medicationId}|${dose.scheduledFor}`;
          const busy = pendingKey === key;
          const done = dose.status === "taken" || dose.status === "skipped";
          return (
            <motion.li
              layout
              key={key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 transition-colors",
                done && "bg-surface-muted",
              )}
            >
              <span className="w-14 shrink-0 text-center text-[0.9375rem] font-semibold text-foreground-strong tabular">{dose.time}</span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate font-medium text-foreground-strong", dose.status === "skipped" && "line-through opacity-70")}>{dose.name}</span>
                <span className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                  {dose.dosage ? <span>{dose.dosage}</span> : null}
                  <span className={cn("rounded-full px-2 py-0.5 font-medium", statusStyles[dose.status].cls)}>{statusStyles[dose.status].label}</span>
                </span>
              </span>
              {done ? (
                <Button variant="ghost" size={compact ? "icon-sm" : "sm"} loading={busy} onClick={() => undo(dose)} aria-label={`Desfazer registro de ${dose.name} às ${dose.time}`}>
                  <RotateCcw />
                  {compact ? null : <span>Desfazer</span>}
                </Button>
              ) : (
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="ghost" size="icon-sm" disabled={busy} onClick={() => mark(dose, "skipped")} aria-label={`Pular ${dose.name} às ${dose.time}`}>
                    <SkipForward />
                  </Button>
                  <Button variant="success" size="sm" loading={busy} onClick={() => mark(dose, "taken")} aria-label={`Marcar ${dose.name} às ${dose.time} como tomada`}>
                    <Check /> {compact ? null : "Tomei"}
                  </Button>
                </div>
              )}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

export function NextDoseCard({ dose }: { dose: ScheduledDose | null }) {
  const { pendingKey, mark } = useDoseActions();
  if (!dose) {
    return (
      <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] bg-[linear-gradient(140deg,#9448bd,#5f2482)] p-6 text-white shadow-glow">
        <div className="bg-grid absolute inset-0 opacity-[0.07]" aria-hidden />
        <div className="relative">
          <p className="text-sm text-white/75">Próximo medicamento</p>
          <p className="mt-3 text-h2 font-semibold text-white">Nenhuma dose pendente hoje</p>
          <p className="mt-1 text-sm text-white/75">Quando houver medicamentos em acompanhamento, o próximo horário aparece aqui.</p>
        </div>
      </div>
    );
  }
  const busy = pendingKey === `${dose.medicationId}|${dose.scheduledFor}`;
  const minutes = Math.round((new Date(dose.scheduledFor).getTime() - Date.now()) / 60000);
  const when = minutes > 0 ? (minutes < 60 ? `em ${minutes} min` : `em ${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ""}`) : minutes > -30 ? "agora" : "atrasada";
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] bg-[linear-gradient(140deg,#9448bd,#5f2482)] p-6 text-white shadow-glow">
      <div className="bg-grid absolute inset-0 opacity-[0.07]" aria-hidden />
      <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-white/75">Próximo medicamento</p>
          <p className="mt-3 text-[1.75rem] leading-tight font-semibold tracking-tight text-white">{dose.name}</p>
          <p className="mt-1 text-white/80">{[dose.dosage, `às ${dose.time}`].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
          <Clock className="size-4" aria-hidden /> {when}
        </span>
      </div>
      <div className="relative mt-6 flex gap-2">
        <Button className="flex-1 bg-white text-brand-700 shadow-none hover:bg-white/90 hover:shadow-none" size="lg" loading={busy} onClick={() => mark(dose, "taken")}>
          <Check /> Tomei
        </Button>
        <Button className="bg-white/15 text-white shadow-none hover:bg-white/25" size="lg" disabled={busy} onClick={() => mark(dose, "skipped")}>
          <X /> Pular
        </Button>
      </div>
    </div>
  );
}
