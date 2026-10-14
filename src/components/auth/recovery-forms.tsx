"use client";

import { useActionState } from "react";
import { forgotPasswordAction, resendConfirmationAction, resetPasswordAction } from "@/server/actions/auth";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormStatus, PasswordInput, SubmitButton, fieldError } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action-result";

const initial: ActionResult = { ok: false, error: "" };

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormStatus state={state} />
      <Field label="E-mail da conta" htmlFor="email" error={fieldError(state, "email")}>
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <SubmitButton block size="lg" pendingLabel="Enviando…">
        Enviar link de redefinição
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormStatus state={state} />
      <Field label="Nova senha" htmlFor="password" hint="Mín. 8 caracteres, com letras e números." error={fieldError(state, "password")}>
        <PasswordInput name="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirmar nova senha" htmlFor="confirmPassword" error={fieldError(state, "confirmPassword")}>
        <PasswordInput name="confirmPassword" autoComplete="new-password" required />
      </Field>
      <SubmitButton block size="lg" pendingLabel="Salvando…">
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}

export function ResendConfirmationForm() {
  const [state, action] = useActionState(resendConfirmationAction, initial);
  return (
    <form action={action} className="space-y-3" noValidate>
      <FormStatus state={state} />
      <Field label="Não recebeu? Reenvie o link" htmlFor="email" error={fieldError(state, "email")}>
        <Input name="email" type="email" autoComplete="email" placeholder="seu e-mail" required />
      </Field>
      <SubmitButton variant="secondary" block pendingLabel="Reenviando…">
        Reenviar confirmação
      </SubmitButton>
    </form>
  );
}
