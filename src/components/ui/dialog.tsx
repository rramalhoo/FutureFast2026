"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  size = "md",
  ...props
}: React.ComponentProps<typeof D.Content> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-[rgb(20_12_26/0.45)] backdrop-blur-[3px] data-[state=closed]:animate-out data-[state=open]:[animation:gv-fade_180ms_ease-out]" />
      <D.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[1.75rem] border border-border bg-surface shadow-lg outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem]",
          "data-[state=open]:[animation:gv-sheet_260ms_cubic-bezier(0.22,1,0.36,1)] sm:data-[state=open]:[animation:gv-pop_220ms_cubic-bezier(0.22,1,0.36,1)]",
          sizes[size],
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-border-strong sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-2">
          <div>
            <D.Title className="text-h3 font-semibold text-foreground-strong">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof title === "string" ? title : "Janela"}</D.Description>
            )}
          </div>
          <D.Close
            className="-mt-1 -mr-2 rounded-xl p-2 text-subtle-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </D.Close>
        </div>
        <div className="scrollbar-thin overflow-y-auto px-6 pt-2 pb-6 safe-bottom">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
