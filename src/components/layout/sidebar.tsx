"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LifeBuoy, UserRound } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { NAV, isActive } from "./nav-config";
import type { UserRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function SidebarNav({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-6">
      {NAV[role].map((section, i) => (
        <div key={i}>
          {section.title ? (
            <p className="mb-1.5 px-3 text-caption font-medium tracking-wide text-subtle-foreground uppercase">
              {section.title}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium transition-colors",
                      active ? "text-primary-soft-foreground" : "text-muted-foreground hover:bg-surface-sunken hover:text-foreground-strong",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId={`nav-active-${onNavigate ? "m" : "d"}`}
                        className="absolute inset-0 rounded-xl bg-primary-soft"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    ) : null}
                    <Icon className={cn("relative size-[1.15rem]", active ? "text-primary" : "text-subtle-foreground group-hover:text-foreground")} aria-hidden />
                    <span className="relative">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ role, statusSlot }: { role: UserRole; statusSlot?: React.ReactNode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[268px] shrink-0 flex-col border-r border-border bg-surface/70 px-4 py-5 backdrop-blur-xl lg:flex">
      <div className="px-2">
        <Logo href={role === "patient" ? "/paciente" : role === "doctor" ? "/medico" : role === "pharmacy" ? "/farmacia" : "/admin"} tagline />
      </div>
      {statusSlot ? <div className="mt-5">{statusSlot}</div> : null}
      <div className="scrollbar-thin mt-6 flex-1 overflow-y-auto">
        <SidebarNav role={role} />
      </div>
      <div className="mt-4 space-y-0.5 border-t border-border pt-4">
        <Link href="/conta" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-sunken hover:text-foreground-strong">
          <UserRound className="size-[1.1rem] text-subtle-foreground" aria-hidden /> Minha conta
        </Link>
        <Link href="/ajuda" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-sunken hover:text-foreground-strong">
          <LifeBuoy className="size-[1.1rem] text-subtle-foreground" aria-hidden /> Central de ajuda
        </Link>
      </div>
    </aside>
  );
}
