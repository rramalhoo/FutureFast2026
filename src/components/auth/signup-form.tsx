"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Building2, HeartPulse, Stethoscope } from "lucide-react";
import { signUpAction } from "@/server/actions/auth";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormStatus, PasswordInput, SubmitButton, fieldError } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

const roles = [
  { value: "patient", label: "Paciente", description: "Organize receitas e medicamentos", icon: HeartPulse },
  { value: "doctor", label: "Médico(a)", description: "Prescreva e acompanhe pacientes", icon: Stethoscope },
  { value: "pharmacy", label: "Farmácia", description: "Confira receitas e atenda", icon: Building2 },
] as const;

export function SignUpForm({ defaultRole }: { defaultRole?: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(signUpAction, { ok: false, error: "" });
  const [role, setRole] = useState<string>(roles.some((r) => r.value === defaultRole) ? defaultRole! : "patient");

  return (
    <form action={action} className="space-y-5" noValidate>
      <FormStatus state={state} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground-strong">Tipo de conta</legend>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
          {roles.map(({ value, label, description, icon: Icon }) => (
            <label
              key={value}
              className={cn(
                "relative flex cursor-pointer flex-col gap-2 rounded-2xl border p-3.5 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
                role === value
                  ? "border-primary bg-primary-soft/60 shadow-[0_0_0_3px_var(--ring)]/20"
                  : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              <Icon className={cn("size-5", role === value ? "text-primary" : "text-subtle-foreground")} aria-hidden />
              <span className="text-sm font-semibold text-foreground-strong">{label}</span>
              <span className="text-caption text-muted-foreground">{description}</span>
            </label>
          ))}
        </div>
        {role !== "patient" ? (
          <p className="mt-2 text-caption text-muted-foreground">
            {role === "doctor"
              ? "Após o cadastro, enviaremos seu CRM para verificação antes de liberar prescrições."
              : "Após o cadastro, a farmácia passa por verificação cadastral e de autorização (AFE)."}
          </p>
        ) : null}
      </fieldset>

      <Field label={role === "pharmacy" ? "Nome do responsável" : "Nome completo"} htmlFor="fullName" error={fieldError(state, "fullName")}>
        <Input name="fullName" autoComplete="name" required />
      </Field>
      <Field label="E-mail" htmlFor="email" error={fieldError(state, "email")}>
        <Input name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Senha" htmlFor="password" hint="Mín. 8 caracteres, com letras e números." error={fieldError(state, "password")}>
          <PasswordInput name="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirmar senha" htmlFor="confirmPassword" error={fieldError(state, "confirmPassword")}>
          <PasswordInput name="confirmPassword" autoComplete="new-password" required />
        </Field>
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="acceptTerms"
            className="mt-0.5 size-4 rounded border-border-strong accent-[var(--primary)]"
            aria-describedby="terms-error"
          />
          <span>
            Li e aceito os{" "}
            <Link href="/termos" className="font-medium text-primary hover:underline" target="_blank">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="font-medium text-primary hover:underline" target="_blank">
              Política de Privacidade
            </Link>
            , incluindo o tratamento de dados de saúde para as finalidades descritas.
          </span>
        </label>
        {fieldError(state, "acceptTerms") ? (
          <p id="terms-error" role="alert" className="mt-1.5 text-caption font-medium text-danger-foreground">
            {fieldError(state, "acceptTerms")}
          </p>
        ) : null}
      </div>

      <SubmitButton block size="lg" pendingLabel="Criando conta…">
        Criar conta
      </SubmitButton>
    </form>
  );
}
