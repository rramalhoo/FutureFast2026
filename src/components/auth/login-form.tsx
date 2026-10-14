"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/server/actions/auth";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, FormStatus, PasswordInput, SubmitButton, fieldError } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action-result";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(signInAction, { ok: false, error: "" });
  return (
    <ActionForm action={action} className="space-y-5" noValidate>
      <FormStatus state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-mail" htmlFor="email" error={fieldError(state, "email")}>
        <Input name="email" type="email" autoComplete="email" inputMode="email" required placeholder="voce@exemplo.com" />
      </Field>
      <Field label="Senha" htmlFor="password" error={fieldError(state, "password")}>
        <PasswordInput name="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        <Link href="/recuperar-senha" className="text-sm font-medium text-primary hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <SubmitButton block size="lg" pendingLabel="Entrando…">
        Entrar
      </SubmitButton>
    </ActionForm>
  );
}
