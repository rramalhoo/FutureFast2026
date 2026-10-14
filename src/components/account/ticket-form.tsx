"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTicketAction } from "@/server/actions/account";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action-result";

export function TicketForm() {
  const [state, action] = useActionState<ActionResult, FormData>(createTicketAction, { ok: false, error: "" });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4" noValidate>
      <FormStatus state={state} />
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <Field label="Categoria" htmlFor="category">
          <NativeSelect name="category" defaultValue="general">
            <option value="general">Dúvida geral</option>
            <option value="account">Conta e acesso</option>
            <option value="technical">Problema técnico</option>
            <option value="verification">Verificação</option>
            <option value="privacy">Privacidade</option>
            <option value="billing">Planos</option>
          </NativeSelect>
        </Field>
        <Field label="Assunto" htmlFor="subject" error={fieldError(state, "subject")}>
          <Input name="subject" />
        </Field>
      </div>
      <Field label="Descrição" htmlFor="body" hint="Não inclua dados de saúde desnecessários." error={fieldError(state, "body")}>
        <Textarea name="body" rows={5} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enviando…">Abrir chamado</SubmitButton>
      </div>
    </form>
  );
}
