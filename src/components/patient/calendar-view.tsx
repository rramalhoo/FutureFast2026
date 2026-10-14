"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Bell, CalendarClock, ChevronLeft, ChevronRight, Pill, Plus, Stethoscope, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionForm, FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import { createReminderAction, deleteReminderAction, toggleReminderAction } from "@/server/actions/patient";
import { patientCancelAppointmentAction } from "@/server/actions/appointments";
import { addDaysISO, type CalendarView as View, fmt, shiftCalendar, todayISO } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  kind: "appointment" | "dose" | "reminder" | "followup";
  title: string;
  subtitle?: string;
  date: string;
  time?: string;
  status?: string;
  statusLabel?: string;
  statusTone?: BadgeTone;
  done?: boolean;
};

const kindStyle = {
  appointment: { icon: Stethoscope, dot: "bg-primary", chip: "bg-primary-soft text-primary-soft-foreground", label: "Consulta" },
  dose: { icon: Pill, dot: "bg-success", chip: "bg-success-soft text-success-foreground", label: "Medicamento" },
  reminder: { icon: Bell, dot: "bg-warning", chip: "bg-warning-soft text-warning-foreground", label: "Lembrete" },
  followup: { icon: CalendarClock, dot: "bg-info", chip: "bg-info-soft text-info-foreground", label: "Retorno" },
} as const;

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function CalendarView({ view, date, from, events }: { view: View; date: string; from: string; events: CalendarEvent[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<CalendarEvent | null>(null);
  const today = todayISO();
  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.time ?? "00:00").localeCompare(b.time ?? "00:00"));
    return map;
  }, [events]);

  const href = (v: View, d: string) => `/paciente/calendario?view=${v}&date=${d}`;
  const title =
    view === "month"
      ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00Z`))
      : view === "week"
        ? `${fmt.dateShort(from)} – ${fmt.dateShort(addDaysISO(from, 6))}`
        : fmt.weekday(date);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="icon" aria-label="Anterior"><Link href={href(view, shiftCalendar(view, date, -1))}><ChevronLeft /></Link></Button>
          <Button asChild variant="secondary" size="icon" aria-label="Próximo"><Link href={href(view, shiftCalendar(view, date, 1))}><ChevronRight /></Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={href(view, today)}>Hoje</Link></Button>
          <h2 className="ml-1 text-h3 font-semibold first-letter:uppercase" aria-live="polite">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-surface-muted p-1" role="group" aria-label="Visualização">
            {(["day", "week", "month"] as View[]).map((v) => (
              <Link
                key={v}
                href={href(v, date)}
                aria-current={view === v ? "page" : undefined}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", view === v ? "bg-surface text-foreground-strong shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
              </Link>
            ))}
          </div>
          <NewReminderDialog defaultDate={date} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-caption text-muted-foreground">
        {Object.entries(kindStyle).map(([k, s]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", s.dot)} /> {s.label}</span>
        ))}
      </div>

      {view === "month" ? (
        <div className="surface-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-surface-muted">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-2 text-center text-caption font-medium text-muted-foreground">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }).map((_, i) => {
              const d = addDaysISO(from, i);
              const list = byDay.get(d) ?? [];
              const inMonth = d.slice(0, 7) === date.slice(0, 7);
              const doses = list.filter((e) => e.kind === "dose");
              const others = list.filter((e) => e.kind !== "dose");
              return (
                <button
                  key={d}
                  onClick={() => router.push(href("day", d))}
                  className={cn(
                    "flex min-h-20 flex-col gap-1 border-r border-b border-border p-1.5 text-left transition-colors hover:bg-surface-muted sm:min-h-28 sm:p-2 [&:nth-child(7n)]:border-r-0",
                    !inMonth && "bg-surface-muted/50 text-subtle-foreground",
                  )}
                  aria-label={`${fmt.dateLong(d)}: ${list.length} eventos`}
                >
                  <span className={cn("flex size-7 items-center justify-center rounded-full text-sm font-medium tabular", d === today && "bg-primary text-primary-foreground")}>
                    {Number(d.slice(8))}
                  </span>
                  <span className="hidden flex-col gap-1 sm:flex">
                    {others.slice(0, 2).map((e) => (
                      <span key={e.id} className={cn("truncate rounded-md px-1.5 py-0.5 text-[0.7rem] font-medium", kindStyle[e.kind].chip)}>
                        {e.time ? `${e.time} ` : ""}{e.title}
                      </span>
                    ))}
                    {doses.length ? <span className="text-[0.7rem] font-medium text-success-foreground">{doses.length} dose(s)</span> : null}
                    {others.length > 2 ? <span className="text-[0.7rem] text-muted-foreground">+{others.length - 2}</span> : null}
                  </span>
                  <span className="flex gap-0.5 sm:hidden">
                    {[...new Set(list.map((e) => e.kind))].map((k) => (
                      <span key={k} className={cn("size-1.5 rounded-full", kindStyle[k].dot)} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={cn("grid gap-3", view === "week" && "md:grid-cols-7")}>
          {Array.from({ length: view === "week" ? 7 : 1 }).map((_, i) => {
            const d = view === "week" ? addDaysISO(from, i) : date;
            const list = byDay.get(d) ?? [];
            return (
              <section key={d} className={cn("surface-card min-h-32 p-3", d === today && "ring-2 ring-primary/30")}>
                <h3 className="mb-2 flex items-center justify-between text-sm font-semibold">
                  <span className="first-letter:uppercase">{view === "week" ? `${WEEKDAYS[i]} ${Number(d.slice(8))}` : fmt.dateLong(d)}</span>
                  {d === today ? <Badge tone="brand">Hoje</Badge> : null}
                </h3>
                {list.length === 0 ? (
                  <p className="text-caption text-muted-foreground">Sem eventos</p>
                ) : (
                  <ul className="space-y-1.5">
                    {list.map((e, idx) => {
                      const S = kindStyle[e.kind];
                      return (
                        <motion.li key={e.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}>
                          <button onClick={() => setSelected(e)} className={cn("flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-transform hover:scale-[1.01]", S.chip, e.done && "opacity-60")}>
                            <S.icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{e.time ? `${e.time} · ` : ""}{e.title}</span>
                              {e.subtitle ? <span className="block truncate text-caption opacity-80">{e.subtitle}</span> : null}
                            </span>
                          </button>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        {selected ? (
          <DialogContent title={selected.title} description={`${kindStyle[selected.kind].label} · ${fmt.dateLong(selected.date)}${selected.time ? ` às ${selected.time}` : ""}`}>
            <EventDetail event={selected} onDone={() => setSelected(null)} />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function EventDetail({ event, onDone }: { event: CalendarEvent; onDone: () => void }) {
  return (
    <div className="space-y-4">
      {event.subtitle ? <p className="text-sm text-muted-foreground">{event.subtitle}</p> : null}
      {event.statusLabel ? <Badge tone={event.statusTone}>{event.statusLabel}</Badge> : null}
      {event.kind === "appointment" && (event.status === "requested" || event.status === "confirmed") ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link href="/paciente/medicos?tab=consultas">Remarcar</Link></Button>
          <ConfirmDialog
            tone="danger"
            title="Cancelar esta consulta?"
            description="O médico será notificado."
            confirmLabel="Cancelar consulta"
            cancelLabel="Manter"
            onConfirm={async () => {
              const r = await patientCancelAppointmentAction(event.id);
              if (r.ok) {
                toast.success(r.message);
                onDone();
              } else toast.error(r.error);
            }}
            trigger={<Button variant="danger-soft">Cancelar consulta</Button>}
          />
        </div>
      ) : null}
      {event.kind === "dose" ? (
        <Button asChild variant="secondary"><Link href="/paciente/medicamentos">Abrir medicamentos</Link></Button>
      ) : null}
      {event.kind === "reminder" ? (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              const r = await toggleReminderAction(event.id, !event.done);
              if (r.ok) onDone();
              else toast.error(r.error);
            }}
          >
            {event.done ? "Marcar como pendente" : "Marcar como feito"}
          </Button>
          <Button
            variant="danger-soft"
            onClick={async () => {
              const r = await deleteReminderAction(event.id);
              if (r.ok) {
                toast.success(r.message);
                onDone();
              } else toast.error(r.error);
            }}
          >
            <Trash2 /> Excluir
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function NewReminderDialog({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const r = await createReminderAction(prev, fd);
    if (r.ok) {
      toast.success(r.message);
      setOpen(false);
    }
    return r;
  }, { ok: false, error: "" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus /> Lembrete</Button>
      </DialogTrigger>
      <DialogContent title="Novo lembrete" description="Exames, retornos, renovação de receita…">
        <ActionForm action={action} className="space-y-4" noValidate>
          <FormStatus state={state.ok ? undefined : state} />
          <Field label="Título" htmlFor="title" required error={fieldError(state, "title")}>
            <Input name="title" placeholder="Ex.: Coletar exame de sangue" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data" htmlFor="date" required error={fieldError(state, "date")}>
              <Input name="date" type="date" defaultValue={defaultDate} />
            </Field>
            <Field label="Horário (opcional)" htmlFor="time" error={fieldError(state, "time")}>
              <Input name="time" type="time" />
            </Field>
          </div>
          <Field label="Descrição" htmlFor="description" error={fieldError(state, "description")}>
            <Textarea name="description" rows={2} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <SubmitButton pendingLabel="Salvando…">Criar lembrete</SubmitButton>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
