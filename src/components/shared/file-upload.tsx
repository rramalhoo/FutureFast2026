"use client";

import * as React from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export type UploadedFile = { path: string; name: string; size: number; type: string };

function safeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-80);
}

/**
 * Envia arquivos direto para um bucket privado do Supabase Storage. O caminho
 * começa sempre por `folder` (ex.: id do usuário), exigido pelas políticas.
 */
export function FileUpload({
  bucket,
  folder,
  name,
  label,
  hint,
  multiple = true,
  onChange,
}: {
  bucket: "verification-documents" | "medical-documents";
  folder: string;
  name?: string;
  label: string;
  hint?: string;
  multiple?: boolean;
  onChange?: (files: UploadedFile[]) => void;
}) {
  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const id = React.useId();

  async function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    const supabase = getBrowserSupabase();
    const added: UploadedFile[] = [];
    for (const file of Array.from(list)) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name}: envie PDF, JPG, PNG ou WEBP.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: o limite é 10 MB.`);
        continue;
      }
      const path = `${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        toast.error(`Não foi possível enviar ${file.name}.`);
        continue;
      }
      added.push({ path, name: file.name, size: file.size, type: file.type });
    }
    const next = multiple ? [...files, ...added] : added.slice(-1);
    setFiles(next);
    onChange?.(next);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground-strong" id={`${id}-label`}>
        {label}
      </span>
      <label
        htmlFor={id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong bg-surface-muted px-4 py-7 text-center transition-colors hover:border-primary hover:bg-primary-soft/40",
          uploading && "pointer-events-none opacity-70",
        )}
      >
        {uploading ? <Loader2 className="size-6 animate-spin text-primary" /> : <Upload className="size-6 text-primary" aria-hidden />}
        <span className="text-sm font-medium text-foreground-strong">
          {uploading ? "Enviando com segurança…" : "Clique ou arraste arquivos aqui"}
        </span>
        <span className="text-caption text-muted-foreground">{hint ?? "PDF, JPG, PNG ou WEBP — até 10 MB."}</span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="sr-only"
          accept={ACCEPTED.join(",")}
          multiple={multiple}
          aria-labelledby={`${id}-label`}
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </label>
      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.path} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
              <FileText className="size-4 text-primary" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-caption text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                className="rounded-lg p-1 text-subtle-foreground hover:bg-danger-soft hover:text-danger"
                aria-label={`Remover ${f.name}`}
                onClick={async () => {
                  await getBrowserSupabase().storage.from(bucket).remove([f.path]);
                  const next = files.filter((x) => x.path !== f.path);
                  setFiles(next);
                  onChange?.(next);
                }}
              >
                <Trash2 className="size-4" />
              </button>
              {name ? <input type="hidden" name={name} value={f.path} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
