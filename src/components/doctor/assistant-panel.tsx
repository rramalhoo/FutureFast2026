"use client";

import * as React from "react";
import { toast } from "sonner";
import { Bot, Copy, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const MODES = [
  { v: "summarize", l: "Resumir texto", p: "Cole o texto que deseja resumir (evite dados identificáveis de pacientes)." },
  { v: "draft", l: "Rascunho administrativo", p: "Ex.: declaração de comparecimento para [nome], consulta em [data] das 14h às 15h." },
  { v: "organize", l: "Organizar tarefas", p: "Cole suas anotações soltas para transformar em lista de tarefas." },
  { v: "help", l: "Ajuda com o Genvity", p: "Ex.: como faço para bloquear minha agenda na próxima semana?" },
] as const;

export function AssistantPanel({ configured }: { configured: boolean }) {
  const [mode, setMode] = React.useState<(typeof MODES)[number]["v"]>("summarize");
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

  async function run() {
    setOutput("");
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({ error: "Falha no assistente." }));
        toast.error(data.error ?? "Falha no assistente.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Falha de conexão com o assistente.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  if (!configured) {
    return (
      <Alert tone="info" icon={Bot} title="Assistente de IA não configurado">
        Defina <code>ANTHROPIC_API_KEY</code> no servidor para habilitar resumos e rascunhos. As tarefas ao lado funcionam normalmente.
      </Alert>
    );
  }
  const current = MODES.find((m) => m.v === mode)!;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de ajuda">
        {MODES.map((m) => (
          <button key={m.v} role="radio" aria-checked={mode === m.v} onClick={() => setMode(m.v)} className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors", mode === m.v ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
            {m.l}
          </button>
        ))}
      </div>
      <label htmlFor="assistant-input" className="sr-only">Pedido</label>
      <Textarea id="assistant-input" rows={6} value={input} onChange={(e) => setInput(e.target.value)} placeholder={current.p} maxLength={12000} />
      <div className="flex justify-end gap-2">
        {loading ? <Button variant="secondary" onClick={() => abortRef.current?.abort()}><Square /> Parar</Button> : null}
        <Button onClick={run} loading={loading} disabled={input.trim().length < 3}><Sparkles /> Gerar</Button>
      </div>
      {output || loading ? (
        <div className="rounded-2xl border border-primary/20 bg-primary-soft/30 p-4" aria-live="polite">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-caption font-semibold text-primary-soft-foreground"><Bot className="size-3.5" /> Rascunho gerado por IA — revise antes de usar</p>
            {output && !loading ? (
              <Button size="sm" variant="ghost" onClick={async () => { await navigator.clipboard.writeText(output); toast.success("Copiado."); }}><Copy /> Copiar</Button>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{output || "Gerando…"}</p>
        </div>
      ) : null}
    </div>
  );
}
