"use client";

import * as React from "react";
import { AlertDialog as A } from "radix-ui";
import { Button } from "./button";
import { cn } from "@/lib/utils";

/**
 * Confirmação acessível (substitui window.confirm). Use para ações
 * destrutivas ou irreversíveis.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Voltar",
  tone = "primary",
  onConfirm,
  children,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  onConfirm: () => Promise<boolean | void> | boolean | void;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <A.Root open={isOpen} onOpenChange={(value) => !pending && setOpen(value)}>
      {trigger ? <A.Trigger asChild>{trigger}</A.Trigger> : null}
      <A.Portal>
        <A.Overlay className="fixed inset-0 z-50 bg-[rgb(20_12_26/0.45)] backdrop-blur-[3px] data-[state=open]:[animation:gv-fade_180ms_ease-out]" />
        <A.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] border border-border bg-surface p-6 shadow-lg",
            "data-[state=open]:[animation:gv-pop_220ms_cubic-bezier(0.22,1,0.36,1)]",
          )}
        >
          <A.Title className="text-h3 font-semibold text-foreground-strong">{title}</A.Title>
          {description ? (
            <A.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</A.Description>
          ) : (
            <A.Description className="sr-only">{title}</A.Description>
          )}
          {children ? <div className="mt-4">{children}</div> : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <A.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                {cancelLabel}
              </Button>
            </A.Cancel>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              loading={pending}
              onClick={async () => {
                setPending(true);
                try {
                  const result = await onConfirm();
                  if (result !== false) setOpen(false);
                } finally {
                  setPending(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </A.Content>
      </A.Portal>
    </A.Root>
  );
}
