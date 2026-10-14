"use client";

import * as React from "react";
import { CalendarX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt, localDateISO } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Slot = { starts_at: string; ends_at: string; modality: "in_person" | "telehealth" };

export function SlotPicker({ slots, selected, onSelect }: { slots: Slot[] | null; selected: string | null; onSelect: (iso: string) => void }) {
  const days = React.useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots ?? []) {
      const d = localDateISO(s.starts_at);
      map.set(d, [...(map.get(d) ?? []), s]);
    }
    return [...map.entries()];
  }, [slots]);
  const [day, setDay] = React.useState<string | null>(null);
  const activeDay = day ?? days[0]?.[0] ?? null;

  if (slots === null) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando horários">
        <div className="flex gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-16 rounded-2xl" />)}</div>
        <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
      </div>
    );
  }
  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <CalendarX className="size-6 text-subtle-foreground" aria-hidden />
        Não há horários disponíveis nas próximas semanas.
      </div>
    );
  }
  const daySlots = days.find(([d]) => d === activeDay)?.[1] ?? [];
  return (
    <div className="space-y-4">
      <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Dias disponíveis">
        {days.map(([d, list]) => {
          const date = new Date(`${d}T12:00:00-03:00`);
          return (
            <button
              type="button"
              key={d}
              role="tab"
              aria-selected={d === activeDay}
              onClick={() => setDay(d)}
              className={cn(
                "flex w-[4.5rem] shrink-0 flex-col items-center rounded-2xl border px-2 py-2.5 transition-colors",
                d === activeDay ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <span className="text-caption capitalize opacity-80">{new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" }).format(date).replace(".", "")}</span>
              <span className="text-lg leading-tight font-semibold tabular">{Number(d.slice(8))}</span>
              <span className="text-[0.65rem] opacity-80">{list.length} horários</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Horários">
        {daySlots.map((s) => (
          <button
            type="button"
            key={s.starts_at}
            role="radio"
            aria-checked={selected === s.starts_at}
            onClick={() => onSelect(s.starts_at)}
            className={cn(
              "h-11 rounded-xl border text-sm font-semibold tabular transition-all",
              selected === s.starts_at ? "border-primary bg-primary-soft text-primary-soft-foreground ring-2 ring-primary/30" : "border-border bg-surface hover:border-primary/50",
            )}
          >
            {fmt.time(s.starts_at)}
          </button>
        ))}
      </div>
    </div>
  );
}
