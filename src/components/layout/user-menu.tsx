"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { LifeBuoy, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ name, email, roleLabel }: { name: string; email: string; roleLabel: string }) {
  const { setTheme, theme } = useTheme();
  // O formulário fica fora do menu: ao selecionar "Sair" o menu fecha e
  // desmonta seu conteúdo antes que um submit interno aconteça.
  const signOutRef = React.useRef<HTMLFormElement>(null);
  return (
    <>
    <form ref={signOutRef} action="/auth/signout" method="post" className="hidden" aria-hidden />
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-xl p-1 pr-2 transition-colors hover:bg-surface-sunken" aria-label="Menu da conta">
        <Avatar name={name} size="sm" />
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-36 truncate text-sm font-medium text-foreground-strong">{name || "Minha conta"}</span>
          <span className="block text-caption text-muted-foreground">{roleLabel}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-foreground-strong">{name}</p>
          <p className="truncate text-caption text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/conta">
            <UserRound /> Minha conta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/ajuda">
            <LifeBuoy /> Central de ajuda
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Aparência</DropdownMenuLabel>
        <div className="grid grid-cols-3 gap-1 px-1.5 pb-1.5" role="group" aria-label="Tema">
          {[
            { v: "light", l: "Claro", i: Sun },
            { v: "dark", l: "Escuro", i: Moon },
            { v: "system", l: "Sistema", i: Monitor },
          ].map(({ v, l, i: Icon }) => (
            <button
              key={v}
              onClick={() => setTheme(v)}
              aria-pressed={theme === v}
              className="flex flex-col items-center gap-1 rounded-xl py-2 text-caption text-muted-foreground transition-colors hover:bg-surface-sunken aria-pressed:bg-primary-soft aria-pressed:text-primary-soft-foreground"
            >
              <Icon className="size-4" aria-hidden />
              {l}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="danger" onSelect={() => signOutRef.current?.requestSubmit()}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
