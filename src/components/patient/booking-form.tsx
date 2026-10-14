"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requestAppointmentAction } from "@/server/actions/appointments";
import { SlotPicker, type Slot } from "./slot-picker";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FormStatus, SubmitButton } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action-result";
import { MODALITY } from "@/lib/labels";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BookingForm({ doctorId, doctorName, slots, modalities }: { doctorId: string; doctorName: string; slots: Slot[]; modalities: ("in_person" | "telehealth")[] }) {
  const [modality, setModality] = React.useState(modalities[0] ?? "in_person");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [state, action] = useActionState<ActionResult, FormData>(requestAppointmentAction, { ok: false, error: "" });
  const filtered = slots.filter((s) => s.modality === modality);

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center [animation:gv-pop_300ms_cubic-bezier(0.22,1,0.36,1)]">
        <CheckCircle2 className="size-12 text-success" aria-hidden />
        <p className="text-h3 font-semibold">Solicitação enviada</p>
        <p className="max-w-sm text-sm text-muted-foreground">{state.message}</p>
        <Button asChild variant="secondary"><Link href="/paciente/medicos?tab=consultas">Ver minhas consultas</Link></Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <FormStatus state={state} />
      <input type="hidden" name="doctorId" value={doctorId} />
      <input type="hidden" name="modality" value={modality} />
      {selected ? <input type="hidden" name="startsAt" value={selected} /> : null}
      {modalities.length > 1 ? (
        <div className="inline-flex rounded-xl border border-border bg-surface-muted p-1" role="radiogroup" aria-label="Modalidade">
          {modalities.map((m) => (
            <button
              type="button"
              key={m}
              role="radio"
              aria-checked={modality === m}
              onClick={() => {
                setModality(m);
                setSelected(null);
              }}
              className={cn("rounded-lg px-4 py-2 text-sm font-medium", modality === m ? "bg-surface text-foreground-strong shadow-sm" : "text-muted-foreground")}
            >
              {MODALITY[m]}
            </button>
          ))}
        </div>
      ) : null}
      <SlotPicker slots={filtered} selected={selected} onSelect={setSelected} />
      <Field label="Motivo da consulta (opcional)" htmlFor="reason" hint="Evite detalhes sensíveis desnecessários.">
        <Textarea name="reason" rows={3} maxLength={500} />
      </Field>
      <fieldset className="space-y-3 rounded-2xl border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-foreground-strong">O que {doctorName} poderá acessar</legend>
        <p className="text-sm text-muted-foreground">Ao confirmar a consulta, o médico verá seu nome, data de nascimento, contato e alergias. Escolha se deseja compartilhar também:</p>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="shareHistory" className="mt-0.5 size-4 accent-[var(--primary)]" />
          <span><span className="font-medium text-foreground-strong">Histórico completo</span> — consultas e receitas de outros médicos, medicamentos e registro de doses.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="shareDocuments" className="mt-0.5 size-4 accent-[var(--primary)]" />
          <span><span className="font-medium text-foreground-strong">Documentos</span> — exames e laudos enviados por você.</span>
        </label>
        <p className="text-caption text-muted-foreground">Você pode alterar ou revogar a qualquer momento em Minha conta → Privacidade.</p>
      </fieldset>
      {selected ? (
        <Alert tone="brand">Horário escolhido: <strong>{fmt.weekday(selected)} às {fmt.time(selected)}</strong> · {MODALITY[modality]}</Alert>
      ) : null}
      <div className="flex justify-end">
        <SubmitButton size="lg" disabled={!selected} pendingLabel="Enviando…">Solicitar consulta</SubmitButton>
      </div>
    </form>
  );
}
