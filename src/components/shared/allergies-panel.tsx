"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, ShieldAlert, Trash2 } from "lucide-react";
import { addAllergyAction, deleteAllergyAction } from "@/server/actions/documents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";

export type AllergyRow = { id: string; substance: string; reaction: string | null; severity: string; recorded_by: string | null };

const SEVERITY: Record<string, { l: string; t: "danger" | "warning" | "info" | "neutral" }> = {
  severe: { l: "Grave", t: "danger" },
  moderate: { l: "Moderada", t: "warning" },
  mild: { l: "Leve", t: "info" },
  unknown: { l: "Gravidade não informada", t: "neutral" },
};

export function AllergiesPanel({ patientId, currentUserId, allergies, canEdit = true }: { patientId: string; currentUserId: string; allergies: AllergyRow[]; canEdit?: boolean }) {
  const [substance, setSubstance] = React.useState("");
  const [reaction, setReaction] = React.useState("");
  const [severity, setSeverity] = React.useState("unknown");
  const [busy, setBusy] = React.useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await addAllergyAction({ patientId, substance, reaction: reaction || undefined, severity: severity as "unknown" });
    setBusy(false);
    if (r.ok) {
      toast.success(r.message);
      setSubstance("");
      setReaction("");
      setSeverity("unknown");
    } else toast.error(r.error);
  }

  return (
    <div className="space-y-4">
      {allergies.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldAlert className="size-4" /> Nenhuma alergia registrada.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {allergies.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-2xl border border-danger/20 bg-danger-soft/50 py-1.5 pr-1.5 pl-3 text-sm">
              <span>
                <span className="font-semibold text-danger-foreground">{a.substance}</span>
                {a.reaction ? <span className="text-muted-foreground"> · {a.reaction}</span> : null}
              </span>
              <Badge tone={SEVERITY[a.severity]?.t ?? "neutral"}>{SEVERITY[a.severity]?.l ?? a.severity}</Badge>
              {canEdit && (a.recorded_by === currentUserId || patientId === currentUserId) ? (
                <button
                  className="rounded-lg p-1 text-subtle-foreground hover:bg-surface hover:text-danger"
                  aria-label={`Remover alergia a ${a.substance}`}
                  onClick={async () => {
                    const r = await deleteAllergyAction(a.id);
                    if (!r.ok) toast.error(r.error);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <form onSubmit={add} className="grid gap-2 sm:grid-cols-[1fr_1fr_180px_auto]">
          <Input aria-label="Substância" placeholder="Substância (ex.: dipirona)" value={substance} onChange={(e) => setSubstance(e.target.value)} required minLength={2} />
          <Input aria-label="Reação" placeholder="Reação (opcional)" value={reaction} onChange={(e) => setReaction(e.target.value)} />
          <NativeSelect aria-label="Gravidade" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="unknown">Gravidade?</option>
            <option value="mild">Leve</option>
            <option value="moderate">Moderada</option>
            <option value="severe">Grave</option>
          </NativeSelect>
          <Button type="submit" variant="secondary" loading={busy}><Plus /> Adicionar</Button>
        </form>
      ) : null}
    </div>
  );
}
