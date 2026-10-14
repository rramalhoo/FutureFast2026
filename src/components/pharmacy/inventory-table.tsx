"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Boxes, Clock, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteInventoryAction, quickStockAction, saveInventoryAction } from "@/server/actions/pharmacy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action-result";
import type { Tables } from "@/lib/supabase/types";
import { STOCK_STATUS } from "@/lib/labels";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { nowMs } from "@/lib/clock";

type Row = Tables<"pharmacy_inventory">;
type Catalog = { id: string; name: string; presentation: string };

export function InventoryTable({ rows, catalog, initialQuery, disabled }: { rows: Row[]; catalog: Catalog[]; initialQuery?: string; disabled?: boolean }) {
  const [query, setQuery] = React.useState(initialQuery ?? "");
  const [status, setStatus] = React.useState("");
  const [editing, setEditing] = React.useState<Row | "new" | null>(null);
  const stale = nowMs() - 7 * 86400000;
  const filtered = rows.filter((r) => (!query || `${r.product_name} ${r.presentation ?? ""} ${r.ean ?? ""}`.toLowerCase().includes(query.toLowerCase())) && (!status || r.stock_status === status));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <Input aria-label="Buscar produto" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, apresentação ou EAN" className="pl-10" />
        </div>
        <NativeSelect aria-label="Filtrar por status" value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          <option value="">Todos os status</option>
          {Object.entries(STOCK_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </NativeSelect>
        <Button onClick={() => setEditing("new")} disabled={disabled}><Plus /> Produto</Button>
      </div>
      <div className="surface-card overflow-x-auto">
        {filtered.length === 0 ? (
          <EmptyState icon={Boxes} title={rows.length ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"} description="Os pacientes só veem disponibilidade de produtos cadastrados aqui." />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-border bg-surface-muted text-left text-caption text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">EAN</th>
                <th className="px-4 py-3 text-right font-medium">Qtd.</th>
                <th className="px-4 py-3 font-medium">Disponibilidade</th>
                <th className="px-4 py-3 font-medium">Atualizado</th>
                <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-surface-muted/60">
                  <td className="px-4 py-3"><span className="font-medium text-foreground-strong">{r.product_name}</span>{r.presentation ? <span className="block text-caption text-muted-foreground">{r.presentation}</span> : null}</td>
                  <td className="px-4 py-3 font-mono text-caption">{r.ean ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular">{r.quantity}</td>
                  <td className="px-4 py-3">
                    <NativeSelect
                      aria-label={`Disponibilidade de ${r.product_name}`}
                      value={r.stock_status}
                      className="h-9 w-40"
                      onChange={async (e) => {
                        const res = await quickStockAction(r.id, e.target.value as Row["stock_status"]);
                        if (!res.ok) toast.error(res.error);
                      }}
                    >
                      {Object.entries(STOCK_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                    </NativeSelect>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("flex items-center gap-1.5 text-caption", new Date(r.updated_at).getTime() < stale ? "font-medium text-warning-foreground" : "text-muted-foreground")}>
                      <Clock className="size-3.5" aria-hidden /> {fmt.relative(r.updated_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Editar ${r.product_name}`} onClick={() => setEditing(r)}><Pencil /></Button>
                      <ConfirmDialog tone="danger" title="Remover produto?" confirmLabel="Remover" onConfirm={async () => { const res = await deleteInventoryAction(r.id); if (res.ok) toast.success(res.message); else toast.error(res.error); }} trigger={<Button variant="ghost" size="icon-sm" aria-label={`Remover ${r.product_name}`}><Trash2 /></Button>} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-caption text-muted-foreground">Integração com sistemas de gestão (ERP): preparada pela coluna “origem” dos registros; a sincronização automática depende de conector específico (plano Genvity Farmácias).</p>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        {editing ? (
          <DialogContent title={editing === "new" ? "Novo produto" : "Editar produto"}>
            <InventoryForm row={editing === "new" ? null : editing} catalog={catalog} onDone={() => setEditing(null)} />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function InventoryForm({ row, catalog, onDone }: { row: Row | null; catalog: Catalog[]; onDone: () => void }) {
  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const r = await saveInventoryAction(prev, fd);
    if (r.ok) {
      toast.success(r.message);
      onDone();
    }
    return r;
  }, { ok: false, error: "" });
  const [name, setName] = React.useState(row?.product_name ?? "");
  const [presentation, setPresentation] = React.useState(row?.presentation ?? "");
  const match = catalog.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormStatus state={state.ok ? undefined : state} />
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <input type="hidden" name="medicationId" value={match?.id ?? ""} />
      <datalist id="inv-catalog">{catalog.map((c) => <option key={c.id} value={c.name}>{c.presentation}</option>)}</datalist>
      <Field label="Produto" htmlFor="productName" required error={fieldError(state, "productName")}>
        <Input name="productName" list="inv-catalog" value={name} onChange={(e) => { setName(e.target.value); const m = catalog.find((c) => c.name.toLowerCase() === e.target.value.toLowerCase()); if (m && !presentation) setPresentation(m.presentation); }} />
      </Field>
      <Field label="Apresentação" htmlFor="presentation" error={fieldError(state, "presentation")}><Input name="presentation" value={presentation} onChange={(e) => setPresentation(e.target.value)} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="EAN" htmlFor="ean" error={fieldError(state, "ean")}><Input name="ean" inputMode="numeric" defaultValue={row?.ean ?? ""} /></Field>
        <Field label="Quantidade" htmlFor="quantity" error={fieldError(state, "quantity")}><Input name="quantity" type="number" min={0} defaultValue={row?.quantity ?? 0} /></Field>
        <Field label="Disponibilidade" htmlFor="stockStatus">
          <NativeSelect name="stockStatus" defaultValue={row?.stock_status ?? "available"}>
            {Object.entries(STOCK_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </NativeSelect>
        </Field>
      </div>
      {match ? <Badge tone="brand">Vinculado ao catálogo de referência</Badge> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancelar</Button>
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </div>
    </form>
  );
}
