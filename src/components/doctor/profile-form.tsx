"use client";

import { useActionState } from "react";
import { updateDoctorProfileAction } from "@/server/actions/doctor";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import { StateSelect } from "@/components/onboarding/state-select";
import type { ActionResult } from "@/lib/action-result";
import type { Tables } from "@/lib/supabase/types";
import { SPECIALTIES } from "@/lib/labels";

export function DoctorProfileForm({ doctor }: { doctor: Tables<"doctors"> }) {
  const [state, action] = useActionState<ActionResult, FormData>(updateDoctorProfileAction, { ok: false, error: "" });
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Especialidade" htmlFor="specialty" error={fieldError(state, "specialty")}><Input name="specialty" list="specialties" defaultValue={doctor.specialty} /></Field>
        <Field label="RQE" htmlFor="rqe" error={fieldError(state, "rqe")}><Input name="rqe" defaultValue={doctor.rqe ?? ""} /></Field>
      </div>
      <datalist id="specialties">{SPECIALTIES.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Cidade" htmlFor="city" error={fieldError(state, "city")}><Input name="city" defaultValue={doctor.city ?? ""} /></Field>
        <Field label="UF" htmlFor="state" error={fieldError(state, "state")}><StateSelect name="state" defaultValue={doctor.state ?? ""} /></Field>
      </div>
      <Field label="Apresentação" htmlFor="bio" hint="Exibida na busca de médicos." error={fieldError(state, "bio")}><Textarea name="bio" rows={4} defaultValue={doctor.bio ?? ""} /></Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground-strong">Modalidades</legend>
        <div className="flex flex-wrap gap-3">
          {[{ v: "in_person", l: "Presencial" }, { v: "telehealth", l: "Teleconsulta" }].map((m) => (
            <label key={m.v} className="flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50">
              <input type="checkbox" name="modalities" value={m.v} defaultChecked={doctor.modalities.includes(m.v as "in_person")} className="size-4 accent-[var(--primary)]" /> {m.l}
            </label>
          ))}
        </div>
        {fieldError(state, "modalities") ? <p role="alert" className="text-caption text-danger-foreground">{fieldError(state, "modalities")}</p> : null}
      </fieldset>
      <div className="space-y-3">
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4 text-sm">
          <span><span className="font-medium text-foreground-strong">Aceitando novos pacientes</span><span className="block text-caption text-muted-foreground">Novos pacientes podem solicitar consultas pela busca.</span></span>
          <input type="checkbox" name="acceptingNewPatients" defaultChecked={doctor.accepting_new_patients} className="size-5 accent-[var(--primary)]" />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-4 text-sm">
          <span><span className="font-medium text-foreground-strong">Habilitar mensagens com pacientes</span><span className="block text-caption text-muted-foreground">Pacientes com vínculo ativo poderão enviar mensagens. O chat não é canal de emergência.</span></span>
          <input type="checkbox" name="messagingEnabled" defaultChecked={doctor.messaging_enabled} className="size-5 accent-[var(--primary)]" />
        </label>
      </div>
      <div className="flex justify-end"><SubmitButton pendingLabel="Salvando…">Salvar perfil</SubmitButton></div>
    </form>
  );
}
