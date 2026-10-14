"use client";

import * as React from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { addAvailabilityAction, addBlockAction, deleteAvailabilityAction, deleteBlockAction } from "@/server/actions/doctor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ActionForm, FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import type { ActionResult } from "@/lib/action-result";
import { MODALITY } from "@/lib/labels";
import { fmt, todayISO } from "@/lib/format";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type Rule = { id: string; weekday: number; start_time: string; end_time: string; slot_minutes: number; modality: "in_person" | "telehealth" };
type Block = { id: string; starts_at: string; ends_at: string; reason: string | null };

export function AvailabilityEditor({ rules }: { rules: Rule[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const r = await addAvailabilityAction(prev, fd);
    if (r.ok) toast.success(r.message);
    return r;
  }, { ok: false, error: "" });
  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {WEEKDAYS.map((day, w) => {
          const list = rules.filter((r) => r.weekday === w).sort((a, b) => a.start_time.localeCompare(b.start_time));
          return (
            <li key={day} className="flex flex-col gap-2 rounded-2xl border border-border p-3 sm:flex-row sm:items-center">
              <span className="w-24 shrink-0 text-sm font-semibold text-foreground-strong">{day}</span>
              <div className="flex flex-1 flex-wrap gap-2">
                {list.length === 0 ? <span className="text-sm text-muted-foreground">Sem atendimento</span> : null}
                {list.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-2 rounded-xl bg-primary-soft py-1 pr-1 pl-3 text-sm text-primary-soft-foreground">
                    <span className="tabular">{fmt.clock(r.start_time)}–{fmt.clock(r.end_time)}</span>
                    <span className="text-caption opacity-80">{r.slot_minutes} min · {MODALITY[r.modality]}</span>
                    <button
                      className="rounded-lg p-1 hover:bg-surface"
                      aria-label={`Remover ${day} ${fmt.clock(r.start_time)}`}
                      onClick={async () => {
                        const res = await deleteAvailabilityAction(r.id);
                        if (!res.ok) toast.error(res.error);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <ActionForm action={action} className="grid gap-3 rounded-2xl border border-dashed border-border-strong p-4 sm:grid-cols-[1fr_120px_120px_120px_1fr_auto] sm:items-end" noValidate>
        <div className="sm:col-span-6"><FormStatus state={state.ok ? undefined : state} /></div>
        <Field label="Dia" htmlFor="weekday"><NativeSelect name="weekday" defaultValue="1">{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</NativeSelect></Field>
        <Field label="Início" htmlFor="startTime" error={fieldError(state, "startTime")}><Input name="startTime" type="time" defaultValue="08:00" /></Field>
        <Field label="Fim" htmlFor="endTime" error={fieldError(state, "endTime")}><Input name="endTime" type="time" defaultValue="12:00" /></Field>
        <Field label="Duração" htmlFor="slotMinutes"><NativeSelect name="slotMinutes" defaultValue="30">{[15, 20, 30, 40, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</NativeSelect></Field>
        <Field label="Modalidade" htmlFor="modality"><NativeSelect name="modality" defaultValue="in_person"><option value="in_person">Presencial</option><option value="telehealth">Teleconsulta</option></NativeSelect></Field>
        <SubmitButton variant="secondary" pendingLabel="Salvando…"><Plus /> Adicionar</SubmitButton>
      </ActionForm>
    </div>
  );
}

export function BlocksEditor({ blocks }: { blocks: Block[] }) {
  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const r = await addBlockAction(prev, fd);
    if (r.ok) toast.success(r.message);
    return r;
  }, { ok: false, error: "" });
  return (
    <div className="space-y-4">
      {blocks.length ? (
        <ul className="space-y-2">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
              <span><Badge tone="warning">Bloqueado</Badge> <span className="ml-2">{fmt.dateTime(b.starts_at)} – {fmt.time(b.ends_at)}</span>{b.reason ? <span className="text-muted-foreground"> · {b.reason}</span> : null}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Remover bloqueio"
                onClick={async () => {
                  const r = await deleteBlockAction(b.id);
                  if (!r.ok) toast.error(r.error);
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum bloqueio futuro.</p>
      )}
      <ActionForm action={action} className="grid gap-3 sm:grid-cols-[160px_110px_110px_1fr_auto] sm:items-end" noValidate>
        <div className="sm:col-span-5"><FormStatus state={state.ok ? undefined : state} /></div>
        <Field label="Data" htmlFor="date" error={fieldError(state, "date")}><Input name="date" type="date" min={todayISO()} defaultValue={todayISO()} /></Field>
        <Field label="De" htmlFor="startTime" error={fieldError(state, "startTime")}><Input name="startTime" type="time" defaultValue="12:00" /></Field>
        <Field label="Até" htmlFor="endTime" error={fieldError(state, "endTime")}><Input name="endTime" type="time" defaultValue="14:00" /></Field>
        <Field label="Motivo" htmlFor="reason"><Input name="reason" placeholder="Ex.: congresso" /></Field>
        <SubmitButton variant="secondary" pendingLabel="Salvando…">Bloquear</SubmitButton>
      </ActionForm>
    </div>
  );
}
