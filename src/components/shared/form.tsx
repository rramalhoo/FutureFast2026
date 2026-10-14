"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { ActionResult } from "@/lib/action-result";

export function SubmitButton({ children, pendingLabel, ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

export function FormStatus({ state }: { state: ActionResult<unknown> | undefined }) {
  if (!state) return null;
  if (!state.ok && state.error) {
    return (
      <Alert tone="danger" className="[animation:gv-fade_200ms_ease-out]">
        {state.error}
      </Alert>
    );
  }
  if (state.ok && state.message) {
    return (
      <Alert tone="success" className="[animation:gv-fade_200ms_ease-out]">
        {state.message}
      </Alert>
    );
  }
  return null;
}

export function fieldError(state: ActionResult<unknown> | undefined, name: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[name]?.[0];
}

export function PasswordInput(props: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 pr-12 text-[0.9375rem] text-foreground-strong shadow-xs outline-none transition-[border-color,box-shadow] hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-ring/25 aria-[invalid=true]:border-danger"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-surface-sunken hover:text-foreground"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
