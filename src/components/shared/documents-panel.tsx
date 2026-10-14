"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, FileText, FolderOpen, Trash2, Upload } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { deleteDocumentAction, documentUrlAction, registerDocumentAction } from "@/server/actions/documents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fmt } from "@/lib/format";

export type DocumentRow = { id: string; title: string; kind: string; created_at: string; size_bytes: number; uploaded_by: string; uploader_name?: string };

const KIND_LABEL: Record<string, string> = { exam: "Exame", report: "Laudo/relatório", prescription: "Receita", certificate: "Atestado", other: "Outro" };
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export function DocumentsPanel({ patientId, currentUserId, documents, canUpload = true }: { patientId: string; currentUserId: string; documents: DocumentRow[]; canUpload?: boolean }) {
  const [title, setTitle] = React.useState("");
  const [kind, setKind] = React.useState("exam");
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) return toast.error("Envie PDF, JPG, PNG ou WEBP.");
    if (file.size > 10 * 1024 * 1024) return toast.error("O limite é 10 MB.");
    setBusy(true);
    const safe = file.name.normalize("NFD").replace(/[^\w.-]/g, "-").slice(-60);
    const path = `${patientId}/${crypto.randomUUID()}-${safe}`;
    const { error } = await getBrowserSupabase().storage.from("medical-documents").upload(path, file, { contentType: file.type });
    if (error) {
      setBusy(false);
      return toast.error("Falha no envio do arquivo.");
    }
    const r = await registerDocumentAction({
      patientId,
      storagePath: path,
      title: title.trim() || file.name,
      kind: kind as "exam",
      mimeType: file.type as "application/pdf",
      sizeBytes: file.size,
    });
    setBusy(false);
    if (r.ok) {
      toast.success(r.message);
      setTitle("");
      if (inputRef.current) inputRef.current.value = "";
    } else toast.error(r.error);
  }

  async function open(id: string) {
    const r = await documentUrlAction(id);
    if (r.ok && r.data) window.open(r.data.url, "_blank", "noopener,noreferrer");
    else if (!r.ok) toast.error(r.error);
  }

  return (
    <div className="space-y-5">
      {canUpload ? (
        <div className="grid gap-3 rounded-2xl border border-border bg-surface-muted p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <Field label="Título" htmlFor="doc-title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Hemograma" />
          </Field>
          <Field label="Tipo" htmlFor="doc-kind">
            <NativeSelect value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(KIND_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </NativeSelect>
          </Field>
          <div>
            <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} className="sr-only" id="doc-file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <Button asChild loading={busy}>
              <label htmlFor="doc-file" className="cursor-pointer"><Upload /> Enviar arquivo</label>
            </Button>
          </div>
        </div>
      ) : null}
      {documents.length === 0 ? (
        <EmptyState compact icon={FolderOpen} title="Nenhum documento" description="Exames, laudos e atestados ficam guardados em armazenamento privado." />
      ) : (
        <ul className="divide-y divide-border">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><FileText className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground-strong">{d.title}</span>
                <span className="block text-caption text-muted-foreground">
                  {fmt.date(d.created_at)} · {(d.size_bytes / 1024).toFixed(0)} KB{d.uploader_name ? ` · enviado por ${d.uploader_name}` : ""}
                </span>
              </span>
              <Badge tone="outline" className="hidden sm:inline-flex">{KIND_LABEL[d.kind] ?? d.kind}</Badge>
              <Button variant="ghost" size="icon-sm" onClick={() => open(d.id)} aria-label={`Abrir ${d.title}`}><Download /></Button>
              {d.uploaded_by === currentUserId ? (
                <ConfirmDialog
                  tone="danger"
                  title="Remover documento?"
                  description="O arquivo será apagado do armazenamento."
                  confirmLabel="Remover"
                  onConfirm={async () => {
                    const r = await deleteDocumentAction(d.id);
                    if (r.ok) toast.success(r.message);
                    else toast.error(r.error);
                  }}
                  trigger={<Button variant="ghost" size="icon-sm" aria-label={`Remover ${d.title}`}><Trash2 /></Button>}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
