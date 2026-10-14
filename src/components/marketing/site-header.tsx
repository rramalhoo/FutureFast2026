"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as D } from "radix-ui";
import { Menu, X } from "lucide-react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/funcionalidades", label: "Funcionalidades" },
  { href: "/para-pacientes", label: "Pacientes" },
  { href: "/para-medicos", label: "Médicos" },
  { href: "/para-farmacias", label: "Farmácias" },
  { href: "/planos", label: "Planos" },
  { href: "/sobre", label: "Sobre" },
];

export function SiteHeader({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <motion.div
        className={cn(
          "mx-auto flex h-16 max-w-6xl items-center justify-between rounded-2xl px-3 transition-[background-color,box-shadow,border-color] duration-300 sm:px-4",
          scrolled ? "border border-border bg-surface/80 shadow-md backdrop-blur-xl" : "border border-transparent",
        )}
      >
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href ? "page" : undefined}
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                pathname === l.href ? "text-foreground-strong" : "text-muted-foreground hover:text-foreground-strong",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {authenticated ? (
            <Button asChild size="sm">
              <Link href="/entrar">Abrir o Genvity</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/cadastro">Criar conta</Link>
              </Button>
            </>
          )}
          <D.Root open={open} onOpenChange={setOpen}>
            <D.Trigger className="rounded-xl p-2 hover:bg-surface-sunken lg:hidden" aria-label="Abrir menu">
              <Menu className="size-5" />
            </D.Trigger>
            <D.Portal>
              <D.Overlay className="fixed inset-0 z-50 bg-[rgb(20_12_26/0.4)] backdrop-blur-[2px] lg:hidden" />
              <D.Content className="fixed inset-x-3 top-3 z-50 rounded-3xl border border-border bg-surface p-4 shadow-lg data-[state=open]:[animation:gv-pop_200ms_cubic-bezier(0.22,1,0.36,1)] lg:hidden">
                <D.Title className="sr-only">Menu</D.Title>
                <D.Description className="sr-only">Páginas do Genvity</D.Description>
                <div className="flex items-center justify-between">
                  <Logo />
                  <D.Close className="rounded-xl p-2 hover:bg-surface-sunken" aria-label="Fechar menu">
                    <X className="size-5" />
                  </D.Close>
                </div>
                <nav className="mt-4 grid gap-1" aria-label="Principal (celular)">
                  {links.map((l) => (
                    <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-surface-sunken">
                      {l.label}
                    </Link>
                  ))}
                </nav>
                {!authenticated ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button asChild variant="secondary">
                      <Link href="/login">Entrar</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/cadastro">Criar conta</Link>
                    </Button>
                  </div>
                ) : null}
              </D.Content>
            </D.Portal>
          </D.Root>
        </div>
      </motion.div>
    </header>
  );
}
