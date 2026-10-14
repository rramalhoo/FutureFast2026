"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ListTodo, Plus, Trash2 } from "lucide-react";
import { createTaskAction, deleteTaskAction, toggleTaskAction } from "@/server/actions/doctor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/switch";
import { Input, NativeSelect } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { fmt, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

type Task = { id: string; title: string; due_date: string | null; done: boolean; patient_id: string | null; patient_name?: string };

export function TasksPanel({ tasks, patients }: { tasks: Task[]; patients: { id: string; name: string }[] }) {
  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState("");
  const [patientId, setPatientId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const today = todayISO();

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await createTaskAction({ title, dueDate: due, patientId });
    setBusy(false);
    if (r.ok) {
      setTitle("");
      setDue("");
      setPatientId("");
    } else toast.error(r.error);
  }

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done).slice(0, 10);
  return (
    <div className="space-y-4">
      <form onSubmit={add} className="space-y-2">
        <label htmlFor="task-title" className="sr-only">Nova tarefa</label>
        <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova tarefa…" />
        <div className="flex gap-2">
          <Input type="date" aria-label="Prazo" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" />
          <NativeSelect aria-label="Paciente (opcional)" value={patientId} onChange={(e) => setPatientId(e.target.value)} className="flex-1">
            <option value="">Sem paciente</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
          <Button type="submit" size="icon" loading={busy} disabled={title.trim().length < 2} aria-label="Adicionar tarefa"><Plus /></Button>
        </div>
      </form>
      {tasks.length === 0 ? <EmptyState compact icon={ListTodo} title="Sem tarefas" /> : null}
      <ul className="space-y-1.5">
        {[...open, ...done].map((t) => (
          <li key={t.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-muted">
            <Checkbox checked={t.done} onCheckedChange={async (v) => { const r = await toggleTaskAction(t.id, v === true); if (!r.ok) toast.error(r.error); }} aria-label={`Concluir ${t.title}`} />
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-sm", t.done ? "text-muted-foreground line-through" : "text-foreground-strong")}>{t.title}</span>
              <span className="flex gap-2 text-caption text-muted-foreground">
                {t.due_date ? <span className={cn(!t.done && t.due_date < today && "font-medium text-danger-foreground")}>{fmt.dateShort(t.due_date)}</span> : null}
                {t.patient_id ? <Link href={`/medico/pacientes/${t.patient_id}`} className="hover:text-primary">{t.patient_name}</Link> : null}
              </span>
            </span>
            <button className="rounded-lg p-1 text-subtle-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-danger" aria-label={`Excluir ${t.title}`} onClick={async () => { await deleteTaskAction(t.id); }}>
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
