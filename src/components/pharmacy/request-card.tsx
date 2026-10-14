"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, QrCode } from "lucide-react";
import { updateRequestAction } from "@/server/actions/pharmacy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { PHARMACY_REQUEST_STATUS } from "@/lib/labels";
import { fmt } from "@/lib/format";
import type { Enums } from "@/lib/supabase/types";

type Status = Enums<"pharmacy_request_status">;
const NEXT: Partial<Record<Status, Status[]>> = {
  received: ["reviewing", "awaiting_stock", "cancelled"],
  reviewing: ["preparing", "awaiting_stock", "cancelled"],
  awaiting_stock: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
};

export function RequestCard({ request }: { request: { id: string; status: Status; created_at: string; patient_name: string; patient_birth?: string | null; items_description: string | null; patient_note: string | null; pharmacy_note: string | null; prescription_id: string | null } }) {
  const options = NEXT[request.status] ?? [];
  const [next, setNext] = React.useState<Status | "">(options[0] ?? "");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function save() {
    if (!next) return;
    setBusy(true);
    const r = await updateRequestAction({ id: request.id, status: next, note });
    setBusy(false);
    if (r.ok) {
      toast.success(r.message);
      setNote("");
    } else toast.error(r.error);
  }

  return (
    <article className="surface-card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-foreground-strong">{request.patient_name}</p>
          <p className="text-caption text-muted-foreground">{fmt.relative(request.created_at)}{request.patient_birth ? ` · nasc. ${fmt.date(request.patient_birth)}` : ""}</p>
        </div>
        <Badge tone={PHARMACY_REQUEST_STATUS[request.status].tone}>{PHARMACY_REQUEST_STATUS[request.status].label}</Badge>
      </div>
      {request.items_description ? <p className="text-sm">{request.items_description}</p> : null}
      {request.patient_note ? <p className="rounded-xl bg-surface-muted p-2.5 text-sm"><span className="text-muted-foreground">Paciente:</span> {request.patient_note}</p> : null}
      {request.pharmacy_note ? <p className="text-caption text-muted-foreground">Última nota: {request.pharmacy_note}</p> : null}
      {request.prescription_id ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary"><Link href={`/farmacia/solicitacoes/${request.id}`}><FileText /> Ver receita anexada</Link></Button>
          <Button asChild size="sm" variant="ghost"><Link href="/farmacia/leitor"><QrCode /> Conferir QR na retirada</Link></Button>
        </div>
      ) : null}
      {options.length ? (
        <div className="mt-auto space-y-2 border-t border-border pt-3">
          <div className="flex gap-2">
            <NativeSelect aria-label="Próximo status" value={next} onChange={(e) => setNext(e.target.value as Status)} className="h-10">
              {options.map((o) => <option key={o} value={o}>{PHARMACY_REQUEST_STATUS[o].label}</option>)}
            </NativeSelect>
            <Button size="sm" className="h-10" loading={busy} onClick={save}>Atualizar</Button>
          </div>
          <Input aria-label="Nota para o paciente" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota para o paciente (opcional)" className="h-10" />
        </div>
      ) : null}
    </article>
  );
}
