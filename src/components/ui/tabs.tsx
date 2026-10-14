"use client";

import * as React from "react";
import { Tabs as T } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof T.List>) {
  return (
    <T.List
      className={cn(
        "scrollbar-thin inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-surface-muted p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground-strong data-[state=active]:bg-surface data-[state=active]:text-foreground-strong data-[state=active]:shadow-sm [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
