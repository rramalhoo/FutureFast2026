"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as D } from "radix-ui";
import { Menu, X } from "lucide-react";
import { NAV, isActive } from "./nav-config";
import { SidebarNav } from "./sidebar";
import { Logo } from "@/components/shared/logo";
import type { UserRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function MobileMenu({ role }: { role: UserRole }) {
  const [open, setOpen] = React.useState(false);
  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger className="rounded-xl p-2 text-foreground hover:bg-surface-sunken lg:hidden" aria-label="Abrir menu">
        <Menu className="size-5" />
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[rgb(20_12_26/0.45)] backdrop-blur-[2px] data-[state=open]:[animation:gv-fade_180ms_ease-out] lg:hidden" />
        <D.Content className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col bg-surface px-4 py-5 shadow-lg outline-none data-[state=open]:[animation:gv-drawer_260ms_cubic-bezier(0.22,1,0.36,1)] lg:hidden">
          <D.Title className="sr-only">Menu</D.Title>
          <D.Description className="sr-only">Navegação do Genvity</D.Description>
          <div className="flex items-center justify-between px-2">
            <Logo />
            <D.Close className="rounded-xl p-2 hover:bg-surface-sunken" aria-label="Fechar menu">
              <X className="size-5" />
            </D.Close>
          </div>
          <div className="scrollbar-thin mt-6 flex-1 overflow-y-auto">
            <SidebarNav role={role} onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-4 border-t border-border pt-4 text-sm">
            <Link href="/conta" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 font-medium hover:bg-surface-sunken">
              Minha conta
            </Link>
            <Link href="/ajuda" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 font-medium hover:bg-surface-sunken">
              Central de ajuda
            </Link>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV[role].flatMap((s) => s.items).filter((i) => i.mobile).slice(0, 5);
  return (
    <nav
      aria-label="Navegação rápida"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 px-2 pt-1.5 backdrop-blur-xl lg:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[0.6875rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary-soft")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
