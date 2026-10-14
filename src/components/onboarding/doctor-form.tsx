"use client";

import { useActionState, useState } from "react";
import { completeDoctorOnboarding } from "@/server/actions/onboarding";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload";
import { Alert } from "@/components/ui/alert";
import { StateSelect } from "./state-select";
import { SPECIALTIES } from "@/lib/labels";
import type { ActionResult } from "@/lib/action-result";

export function DoctorOnboardingForm({ defaultName, userId }: { defaultName: string; userId: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(completeDoctorOnboarding, { ok: false, error: "" });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormStatus state={state} />
      <Field label="Nome completo (como no CRM)" htmlFor="fullName" required error={fieldError(state, "fullName")}>
        <Input name="fullName" defaultValue={defaultName} autoComplete="name" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[1fr_120px_1fr]">
        <Field label="Número do CRM" htmlFor="crm" required error={fieldError(state, "crm")}>
          <Input name="crm" inputMode="numeric" />
        </Field>
        <Field label="UF do CRM" htmlFor="crmState" required error={fieldError(state, "crmState")}>
          <StateSelect name="crmState" />
        </Field>
        <Field label="RQE (opcional)" htmlFor="rqe" error={fieldError(state, "rqe")}>
          <Input name="rqe" />
        </Field>
      </div>
      <Field label="Especialidade" htmlFor="specialty" required error={fieldError(state, "specialty")}>
        <Input name="specialty" list="specialties" placeholder="Ex.: Clínica médica" />
      </Field>
      <datalist id="specialties">
        {SPECIALTIES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
        <Field label="Cidade de atendimento" htmlFor="city" required error={fieldError(state, "city")}>
          <Input name="city" />
        </Field>
        <Field label="Estado" htmlFor="state" required error={fieldError(state, "state")}>
          <StateSelect name="state" />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground-strong">Modalidades de atendimento</legend>
        <div className="flex flex-wrap gap-3">
          {[
            { v: "in_person", l: "Presencial" },
            { v: "telehealth", l: "Teleconsulta" },
          ].map((m) => (
            <label key={m.v} className="flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50">
              <input type="checkbox" name="modalities" value={m.v} defaultChecked={m.v === "in_person"} className="size-4 accent-[var(--primary)]" />
              {m.l}
            </label>
          ))}
        </div>
        {fieldError(state, "modalities") ? (
          <p role="alert" className="mt-1.5 text-caption font-medium text-danger-foreground">
            {fieldError(state, "modalities")}
          </p>
        ) : null}
      </fieldset>
      <Field label="Apresentação profissional (opcional)" htmlFor="bio" hint="Visível para pacientes na busca de médicos." error={fieldError(state, "bio")}>
        <Textarea name="bio" maxLength={1200} />
      </Field>
      <FileUpload
        bucket="verification-documents"
        folder={userId}
        name="documentPaths"
        label="Carteira do CRM (frente e verso) e documento com foto"
        onChange={setFiles}
      />
      <Alert tone="brand">
        Os documentos ficam em armazenamento privado e são acessados apenas pela equipe de verificação. A análise
        confere o registro junto ao conselho regional; até a aprovação, prescrições e acesso a pacientes ficam
        bloqueados.
      </Alert>
      <div className="flex justify-end">
        <SubmitButton size="lg" disabled={files.length === 0} pendingLabel="Enviando…">
          Enviar para verificação
        </SubmitButton>
      </div>
    </form>
  );
}
