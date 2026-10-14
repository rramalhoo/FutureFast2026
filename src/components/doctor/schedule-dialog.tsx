"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { doctorScheduleAppointmentAction } from "@/server/actions/appointments";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm, FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action-result";
import { todayISO } from "@/lib/format";

export function ScheduleForPatientDialog({
  patientId,
  patientName,
  patients,
  trigger,
}: {
  patientId?: string;
  patientName?: string;
  patients?: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const r = await doctorScheduleAppointmentAction(prev, fd);
    if (r.ok) {
      toast.success(r.message);
      setOpen(false);
    }
    return r;
  }, { ok: false, error: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Agendar consulta" description={patientName ? `Para ${patientName}. A consulta já entra confirmada.` : "A consulta já entra confirmada e o paciente é notificado."}>
        <ActionForm action={action} className="space-y-4" noValidate>
          <FormStatus state={state.ok ? undefined : state} />
          {patientId ? (
            <input type="hidden" name="patientId" value={patientId} />
          ) : (
            <Field label="Paciente" htmlFor="patientId" error={fieldError(state, "patientId")}>
              <NativeSelect name="patientId" defaultValue="">
                <option value="" disabled>Selecione</option>
                {(patients ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </NativeSelect>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Data" htmlFor="date" error={fieldError(state, "date")}><Input name="date" type="date" min={todayISO()} defaultValue={todayISO()} /></Field>
            <Field label="Horário" htmlFor="time" error={fieldError(state, "time")}><Input name="time" type="time" defaultValue="09:00" /></Field>
            <Field label="Duração" htmlFor="duration" error={fieldError(state, "duration")}>
              <NativeSelect name="duration" defaultValue="30">
                {[15, 20, 30, 40, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Modalidade" htmlFor="modality">
            <NativeSelect name="modality" defaultValue="in_person">
              <option value="in_person">Presencial</option>
              <option value="telehealth">Teleconsulta</option>
            </NativeSelect>
          </Field>
          <Field label="Motivo / observação" htmlFor="reason"><Input name="reason" placeholder="Ex.: retorno" /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <SubmitButton pendingLabel="Agendando…">Agendar</SubmitButton>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
