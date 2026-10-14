"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Ellipsis, UserX, X } from "lucide-react";
import { doctorUpdateAppointmentAction } from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { nowMs } from "@/lib/clock";

type Action = "confirm" | "decline" | "cancel" | "complete" | "no_show";

export function AppointmentButtons({ id, status, startsAt }: { id: string; status: string; startsAt: string }) {
  const [busy, setBusy] = React.useState<Action | null>(null);
  const [reasonFor, setReasonFor] = React.useState<"decline" | "cancel" | null>(null);
  const [reason, setReason] = React.useState("");
  const past = new Date(startsAt).getTime() < nowMs() + 3600 * 1000;

  async function run(action: Action, why?: string) {
    setBusy(action);
    const r = await doctorUpdateAppointmentAction({ id, action, reason: why });
    setBusy(null);
    if (r.ok) {
      toast.success(r.message);
      setReasonFor(null);
      setReason("");
    } else toast.error(r.error);
  }

  return (
    <div className="flex items-center gap-1.5">
      {status === "requested" ? (
        <>
          <Button size="sm" variant="success" loading={busy === "confirm"} onClick={() => run("confirm")}><Check /> Confirmar</Button>
          <Button size="sm" variant="ghost" onClick={() => setReasonFor("decline")}><X /> Recusar</Button>
        </>
      ) : null}
      {status === "confirmed" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label="Ações da consulta"><Ellipsis /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {past ? <DropdownMenuItem onSelect={() => run("complete")}><Check /> Marcar como realizada</DropdownMenuItem> : null}
            {past ? <DropdownMenuItem onSelect={() => run("no_show")}><UserX /> Paciente não compareceu</DropdownMenuItem> : null}
            <DropdownMenuItem tone="danger" onSelect={() => setReasonFor("cancel")}><X /> Cancelar consulta</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Dialog open={!!reasonFor} onOpenChange={(v) => !v && setReasonFor(null)}>
        <DialogContent title={reasonFor === "decline" ? "Recusar solicitação" : "Cancelar consulta"} description="O paciente verá o motivo informado.">
          <label htmlFor="appt-reason" className="text-sm font-medium">Motivo</label>
          <Textarea id="appt-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1.5" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReasonFor(null)}>Voltar</Button>
            <Button variant="danger" loading={!!busy} disabled={reasonFor === "cancel" && reason.trim().length < 3} onClick={() => run(reasonFor!, reason)}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
