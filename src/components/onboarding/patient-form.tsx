"use client";

import { useActionState } from "react";
import { completePatientOnboarding } from "@/server/actions/onboarding";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect } from "@/components/ui/input";
import { FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import { StateSelect } from "./state-select";
import type { ActionResult } from "@/lib/action-result";

export function PatientOnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(completePatientOnboarding, { ok: false, error: "" });
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormStatus state={state} />
      <Field label="Nome completo" htmlFor="fullName" required error={fieldError(state, "fullName")}>
        <Input name="fullName" defaultValue={defaultName} autoComplete="name" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Data de nascimento" htmlFor="birthDate" required error={fieldError(state, "birthDate")}>
          <Input name="birthDate" type="date" autoComplete="bday" />
        </Field>
        <Field label="Celular com DDD" htmlFor="phone" required error={fieldError(state, "phone")}>
          <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 91234-5678" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
        <Field label="Cidade" htmlFor="city" required error={fieldError(state, "city")}>
          <Input name="city" autoComplete="address-level2" />
        </Field>
        <Field label="Estado" htmlFor="state" required error={fieldError(state, "state")}>
          <StateSelect name="state" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="CPF (opcional)"
          htmlFor="cpf"
          hint="Ajuda farmácias a confirmar sua identidade na dispensação."
          error={fieldError(state, "cpf")}
        >
          <Input name="cpf" inputMode="numeric" placeholder="000.000.000-00" />
        </Field>
        <Field label="Sexo (opcional)" htmlFor="sex" error={fieldError(state, "sex")}>
          <NativeSelect name="sex" defaultValue="">
            <option value="">Prefiro não informar</option>
            <option value="female">Feminino</option>
            <option value="male">Masculino</option>
            <option value="other">Outro</option>
          </NativeSelect>
        </Field>
      </div>
      <div className="flex justify-end pt-2">
        <SubmitButton size="lg" pendingLabel="Salvando…">
          Concluir cadastro
        </SubmitButton>
      </div>
    </form>
  );
}
