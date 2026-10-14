"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createConsultationAction } from "@/server/actions/doctor";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action-result";
import { fmt } from "@/lib/format";

type Appt = { id: string; patientId: string; startsAt: string };

function localInputValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
  return parts.replace(" ", "T");
}

export function ConsultationForm({ patients, appointments, defaultPatient }: { patients: { id: string; name: string }[]; appointments: Appt[]; defaultPatient?: string }) {
  const router = useRouter();
  const [patientId, setPatientId] = React.useState(defaultPatient ?? "");
  const [share, setShare] = React.useState(false);
  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    fd.set("occurredAt", new Date(`${String(fd.get("occurredLocal"))}:00-03:00`).toISOString());
    const r = await createConsultationAction(prev, fd);
    if (r.ok) {
      toast.success(r.message);
      router.push(`/medico/pacientes/${fd.get("patientId")}`);
    }
    return r;
  }, { ok: false, error: "" });
  const patientAppts = appointments.filter((a) => a.patientId === patientId);

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormStatus state={state.ok ? undefined : state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paciente" htmlFor="patientId" required error={fieldError(state, "patientId")}>
          <NativeSelect name="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="" disabled>Selecione</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Consulta agendada (opcional)" htmlFor="appointmentId" hint="Vincular marca a consulta como realizada.">
          <NativeSelect name="appointmentId" defaultValue="">
            <option value="">Sem vínculo</option>
            {patientAppts.map((a) => <option key={a.id} value={a.id}>{fmt.dateTime(a.startsAt)}</option>)}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data e hora do atendimento" htmlFor="occurredLocal" required error={fieldError(state, "occurredAt")}>
          <Input name="occurredLocal" type="datetime-local" defaultValue={localInputValue()} />
        </Field>
        <Field label="Motivo" htmlFor="reason" error={fieldError(state, "reason")}>
          <Input name="reason" />
        </Field>
      </div>
      <Field label="Resumo para o paciente" htmlFor="summaryForPatient" hint="Visível ao paciente no histórico dele." error={fieldError(state, "summaryForPatient")}>
        <Textarea name="summaryForPatient" rows={4} />
      </Field>
      <Field label="Observações clínicas" htmlFor="clinicalNote" hint="Privadas por padrão." error={fieldError(state, "clinicalNote")}>
        <Textarea name="clinicalNote" rows={5} />
      </Field>
      <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4 text-sm">
        <span><span className="font-medium text-foreground-strong">Compartilhar observações com o paciente</span><span className="block text-caption text-muted-foreground">Aparecerão no histórico de saúde do paciente.</span></span>
        <Switch checked={share} onCheckedChange={setShare} />
        {share ? <input type="hidden" name="shareNoteWithPatient" value="on" /> : null}
      </label>
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <Field label="Retorno sugerido" htmlFor="followUpDate" error={fieldError(state, "followUpDate")}>
          <Input name="followUpDate" type="date" />
        </Field>
        <Field label="Orientação de retorno" htmlFor="followUpNotes" error={fieldError(state, "followUpNotes")}>
          <Input name="followUpNotes" placeholder="Ex.: trazer exames" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton size="lg" pendingLabel="Salvando…">Registrar consulta</SubmitButton>
      </div>
    </form>
  );
}
