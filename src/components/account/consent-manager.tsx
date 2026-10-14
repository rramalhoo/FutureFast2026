"use client";

import * as React from "react";
import { toast } from "sonner";
import { ShieldOff } from "lucide-react";
import { updateConsentAction, revokeCareAction } from "@/server/actions/care";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type ConsentRow = {
  doctorId: string;
  doctorName: string;
  specialty: string;
  status: "pending" | "active" | "revoked";
  shareHistory: boolean;
  shareDocuments: boolean;
};

export function ConsentManager({ rows }: { rows: ConsentRow[] }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <ConsentItem key={row.doctorId} row={row} />
      ))}
    </ul>
  );
}

function ConsentItem({ row }: { row: ConsentRow }) {
  const [history, setHistory] = React.useState(row.shareHistory);
  const [docs, setDocs] = React.useState(row.shareDocuments);
  const [pending, start] = React.useTransition();

  function update(h: boolean, d: boolean) {
    const prev = { h: history, d: docs };
    setHistory(h);
    setDocs(d);
    start(async () => {
      const r = await updateConsentAction(row.doctorId, h, d);
      if (r.ok) toast.success(r.message);
      else {
        setHistory(prev.h);
        setDocs(prev.d);
        toast.error(r.error);
      }
    });
  }

  return (
    <li className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={row.doctorName} />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground-strong">{row.doctorName}</p>
          <p className="text-caption text-muted-foreground">{row.specialty}</p>
        </div>
        {row.status === "pending" ? <Badge tone="warning">Aguardando confirmação</Badge> : null}
        {row.status === "revoked" ? <Badge tone="neutral">Encerrado</Badge> : null}
      </div>
      {row.status !== "revoked" ? (
        <div className="flex flex-wrap items-center gap-4" aria-busy={pending}>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={history} onCheckedChange={(v) => update(v, docs)} aria-label={`Compartilhar histórico com ${row.doctorName}`} />
            Histórico completo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={docs} onCheckedChange={(v) => update(history, v)} aria-label={`Compartilhar documentos com ${row.doctorName}`} />
            Documentos
          </label>
          <ConfirmDialog
            tone="danger"
            title="Encerrar vínculo?"
            description={`${row.doctorName} deixará de acessar seus dados e não poderá emitir novas receitas para você. Receitas já emitidas continuam válidas.`}
            confirmLabel="Encerrar vínculo"
            onConfirm={async () => {
              const r = await revokeCareAction(row.doctorId);
              if (r.ok) toast.success(r.message);
              else toast.error(r.error);
            }}
            trigger={
              <Button variant="ghost" size="sm" className="text-danger-foreground">
                <ShieldOff /> Encerrar
              </Button>
            }
          />
        </div>
      ) : null}
    </li>
  );
}
