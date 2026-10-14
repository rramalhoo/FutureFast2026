"use client";

import * as React from "react";
import { toast } from "sonner";
import { respondInvitationAction } from "@/server/actions/care";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function InvitationCard({ id, doctorName, specialty, crm }: { id: string; doctorName: string; specialty: string; crm: string }) {
  const [history, setHistory] = React.useState(false);
  const [docs, setDocs] = React.useState(false);
  const [pending, setPending] = React.useState<"accept" | "decline" | null>(null);
  async function respond(accept: boolean) {
    setPending(accept ? "accept" : "decline");
    const r = await respondInvitationAction(id, accept, history, docs);
    setPending(null);
    if (r.ok) toast.success(r.message);
    else toast.error(r.error);
  }
  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-3">
        <Avatar name={doctorName} size="lg" />
        <div>
          <p className="font-semibold text-foreground-strong">{doctorName}</p>
          <p className="text-caption text-muted-foreground">{specialty} · {crm}</p>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Convidou você para acompanhamento. Ao aceitar, este médico poderá ver seus dados básicos e alergias e emitir receitas para você.</p>
      <div className="mt-3 space-y-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={history} onChange={(e) => setHistory(e.target.checked)} className="size-4 accent-[var(--primary)]" /> Compartilhar histórico completo</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={docs} onChange={(e) => setDocs(e.target.checked)} className="size-4 accent-[var(--primary)]" /> Compartilhar documentos</label>
      </div>
      <div className="mt-4 flex gap-2">
        <Button loading={pending === "accept"} disabled={!!pending} onClick={() => respond(true)}>Aceitar</Button>
        <Button variant="ghost" loading={pending === "decline"} disabled={!!pending} onClick={() => respond(false)}>Recusar</Button>
      </div>
    </div>
  );
}
