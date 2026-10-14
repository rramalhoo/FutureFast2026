"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog as D } from "radix-ui";
import { CornerDownLeft, Search } from "lucide-react";
import { NAV } from "./nav-config";
import { globalSearch, type SearchHit } from "@/server/actions/search";
import type { UserRole } from "@/lib/supabase/types";

export function CommandPalette({ role }: { role: UserRole }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setHits(await globalSearch(query));
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const groups = hits.reduce<Record<string, SearchHit[]>>((acc, h) => {
    (acc[h.group] ??= []).push(h);
    return acc;
  }, {});

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-border bg-surface px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:border-border-strong"
        aria-label="Pesquisar (Ctrl+K)"
      >
        <Search className="size-4 text-subtle-foreground" aria-hidden />
        <span className="hidden flex-1 text-left sm:block">Pesquisar…</span>
        <kbd className="hidden rounded-md border border-border bg-surface-muted px-1.5 py-0.5 font-sans text-[0.6875rem] font-medium sm:block">
          Ctrl K
        </kbd>
      </button>
      <D.Root open={open} onOpenChange={setOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-[rgb(20_12_26/0.4)] backdrop-blur-[3px] data-[state=open]:[animation:gv-fade_160ms_ease-out]" />
          <D.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-lg outline-none data-[state=open]:[animation:gv-pop_200ms_cubic-bezier(0.22,1,0.36,1)]">
            <D.Title className="sr-only">Pesquisa global</D.Title>
            <D.Description className="sr-only">Pesquise páginas e registros que você pode acessar.</D.Description>
            <Command shouldFilter={false} label="Pesquisa global">
              <div className="flex items-center gap-3 border-b border-border px-4">
                <Search className="size-5 text-subtle-foreground" aria-hidden />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Pesquise páginas, pacientes, receitas…"
                  className="h-14 flex-1 bg-transparent text-base text-foreground-strong outline-none placeholder:text-subtle-foreground"
                />
              </div>
              <Command.List className="scrollbar-thin max-h-[min(60vh,420px)] overflow-y-auto p-2">
                {loading ? <Command.Loading><p className="px-3 py-4 text-sm text-muted-foreground">Pesquisando…</p></Command.Loading> : null}
                {query.length >= 2 && !loading && hits.length === 0 ? (
                  <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</Command.Empty>
                ) : null}
                {Object.entries(groups).map(([group, items]) => (
                  <Command.Group key={group} heading={group} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-subtle-foreground">
                    {items.map((h, i) => (
                      <Command.Item key={`${h.href}-${i}`} value={`${h.href}-${i}`} onSelect={() => go(h.href)} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm data-[selected=true]:bg-surface-sunken">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground-strong">{h.title}</span>
                          {h.subtitle ? <span className="block truncate text-caption text-muted-foreground">{h.subtitle}</span> : null}
                        </span>
                        <CornerDownLeft className="size-3.5 text-subtle-foreground" aria-hidden />
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
                <Command.Group heading="Ir para" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-subtle-foreground">
                  {NAV[role]
                    .flatMap((s) => s.items)
                    .filter((i) => !query || i.label.toLowerCase().includes(query.toLowerCase()))
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item key={item.href} value={item.href} onSelect={() => go(item.href)} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground data-[selected=true]:bg-surface-sunken">
                          <Icon className="size-4 text-subtle-foreground" aria-hidden />
                          {item.label}
                        </Command.Item>
                      );
                    })}
                </Command.Group>
              </Command.List>
            </Command>
          </D.Content>
        </D.Portal>
      </D.Root>
    </>
  );
}
