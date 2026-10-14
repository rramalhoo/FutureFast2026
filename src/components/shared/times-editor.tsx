"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Lista editável de horários HH:MM. Emite campos ocultos `name` para formulários. */
export function TimesEditor({
  value,
  onChange,
  name,
  max = 8,
  label = "Horários",
}: {
  value: string[];
  onChange: (times: string[]) => void;
  name?: string;
  max?: number;
  label?: string;
}) {
  const id = React.useId();
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground-strong">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {value.map((t, i) => (
          <div key={i} className="flex items-center gap-1 rounded-xl border border-border bg-surface pr-1">
            <Input
              type="time"
              value={t}
              aria-label={`${label} ${i + 1}`}
              id={`${id}-${i}`}
              className="h-10 w-[7.5rem] border-0 shadow-none focus:ring-0"
              onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
            />
            <button
              type="button"
              className="rounded-lg p-1.5 text-subtle-foreground hover:bg-danger-soft hover:text-danger"
              aria-label={`Remover horário ${t}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <X className="size-4" />
            </button>
            {name ? <input type="hidden" name={name} value={t} /> : null}
          </div>
        ))}
        {value.length < max ? (
          <Button type="button" variant="soft" size="sm" className="h-10" onClick={() => onChange([...value, value.length ? "20:00" : "08:00"])}>
            <Plus /> Horário
          </Button>
        ) : null}
      </div>
    </fieldset>
  );
}
