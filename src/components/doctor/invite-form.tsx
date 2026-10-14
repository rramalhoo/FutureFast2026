"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import { invitePatientAction } from "@/server/actions/care";
import { Input } from "@/components/ui/input";
import { ActionForm, FormStatus, SubmitButton } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action-result";

export function InviteForm({ disabled }: { disabled?: boolean }) {
  const [state, action] = useActionState<ActionResult, FormData>(invitePatientAction, { ok: false, error: "" });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <ActionForm ref={ref} action={action} className="space-y-3" noValidate>
      <FormStatus state={state} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="invite-email" className="sr-only">E-mail do paciente</label>
        <Input id="invite-email" name="email" type="email" placeholder="email@paciente.com" disabled={disabled} className="flex-1" />
        <SubmitButton disabled={disabled} pendingLabel="Enviando…"><UserPlus /> Convidar</SubmitButton>
      </div>
      <p className="text-caption text-muted-foreground">O paciente precisa aceitar o convite no app. Por privacidade, não informamos se o e-mail possui conta.</p>
    </ActionForm>
  );
}
