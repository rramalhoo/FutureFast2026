"use client";

import { Accordion as A } from "radix-ui";
import { ChevronDown } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <A.Root type="single" collapsible className="divide-y divide-border overflow-hidden rounded-[1.5rem] border border-border bg-surface">
      {items.map((item, i) => (
        <A.Item key={i} value={`q${i}`}>
          <A.Header>
            <A.Trigger className="group flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base font-medium text-foreground-strong hover:bg-surface-muted">
              {item.q}
              <ChevronDown className="size-5 shrink-0 text-subtle-foreground transition-transform duration-300 group-data-[state=open]:rotate-180" aria-hidden />
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden data-[state=closed]:animate-[gv-collapse_200ms_ease-out] data-[state=open]:animate-[gv-expand_260ms_cubic-bezier(0.22,1,0.36,1)]">
            <p className="px-6 pb-5 text-[0.9375rem] leading-relaxed text-muted-foreground">{item.a}</p>
          </A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
