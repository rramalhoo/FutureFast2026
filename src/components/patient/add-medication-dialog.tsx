"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { addPersonalMedicationAction } from "@/server/actions/patient";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ActionForm, FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import { TimesEditor } from "@/components/shared/times-editor";
import type { ActionResult } from "@/lib/action-result";
import { todayISO } from "@/lib/format";

export function AddMedicationDialog() {
  const [open, setOpen] = React.useState(false);
  const [times, setTimes] = React.useState<string[]>(["08:00"]);
  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const r = await addPersonalMedicationAction(prev, fd);
    if (r.ok) {
      setOpen(false);
      setTimes(["08:00"]);
    }
    return r;
  }, { ok: false, error: "" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> Registro pessoal</Button>
      </DialogTrigger>
      <DialogContent size="lg" title="Adicionar medicamento" description="Para acompanhar algo que você já usa. Não cria nem altera prescrições.">
        <ActionForm action={action} className="space-y-5" noValidate>
          <Alert tone="info">Siga sempre a orientação do seu médico ou farmacêutico. O Genvity não recomenda doses.</Alert>
          <FormStatus state={state.ok ? undefined : state} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do medicamento" htmlFor="name" required error={fieldError(state, "name")}>
              <Input name="name" />
            </Field>
            <Field label="Apresentação" htmlFor="presentation" error={fieldError(state, "presentation")}>
              <Input name="presentation" placeholder="Ex.: 50 mg comprimido" />
            </Field>
            <Field label="Dose (como orientado)" htmlFor="dosage" error={fieldError(state, "dosage")}>
              <Input name="dosage" placeholder="Ex.: 1 comprimido" />
            </Field>
            <Field label="Frequência (como orientado)" htmlFor="frequency" error={fieldError(state, "frequency")}>
              <Input name="frequency" placeholder="Ex.: 2 vezes ao dia" />
            </Field>
          </div>
          <TimesEditor value={times} onChange={setTimes} name="scheduleTimes" label="Horários dos lembretes" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Início" htmlFor="startDate" required error={fieldError(state, "startDate")}>
              <Input name="startDate" type="date" defaultValue={todayISO()} />
            </Field>
            <Field label="Término (opcional)" htmlFor="endDate" error={fieldError(state, "endDate")}>
              <Input name="endDate" type="date" />
            </Field>
            <Field label="Tratamento (opcional)" htmlFor="treatmentLabel" error={fieldError(state, "treatmentLabel")}>
              <Input name="treatmentLabel" placeholder="Ex.: Pressão" />
            </Field>
          </div>
          <Field label="Observações" htmlFor="instructions" error={fieldError(state, "instructions")}>
            <Textarea name="instructions" rows={2} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <SubmitButton pendingLabel="Salvando…">Adicionar</SubmitButton>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
