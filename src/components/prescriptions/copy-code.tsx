"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyCode({ code }: { code: string }) {
  const formatted = code.match(/.{1,4}/g)?.join(" ") ?? code;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          toast.success("Código copiado.");
        } catch {
          toast.error("Não foi possível copiar.");
        }
      }}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-border-strong bg-surface-muted px-3 py-2.5 text-left"
      aria-label="Copiar código de verificação"
    >
      <span>
        <span className="block text-caption text-muted-foreground">Código de verificação</span>
        <span className="block font-mono text-sm tracking-wide text-foreground-strong">{formatted}</span>
      </span>
      <Copy className="size-4 text-subtle-foreground group-hover:text-primary" aria-hidden />
    </button>
  );
}
