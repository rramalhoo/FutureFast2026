import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const columns = [
  {
    title: "Produto",
    links: [
      { href: "/funcionalidades", label: "Funcionalidades" },
      { href: "/planos", label: "Planos" },
      { href: "/cadastro", label: "Criar conta" },
    ],
  },
  {
    title: "Para quem",
    links: [
      { href: "/para-pacientes", label: "Pacientes" },
      { href: "/para-medicos", label: "Médicos" },
      { href: "/para-farmacias", label: "Farmácias" },
    ],
  },
  {
    title: "Genvity",
    links: [
      { href: "/sobre", label: "Sobre" },
      { href: "/privacidade", label: "Privacidade" },
      { href: "/termos", label: "Termos de uso" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs space-y-4">
          <Logo />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Plataforma que conecta médicos, pacientes e farmácias com segurança e privacidade por padrão.
          </p>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <h2 className="text-sm font-semibold">{c.title}</h2>
            <ul className="mt-3 space-y-2">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground-strong">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-caption text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Genvity. Todos os direitos reservados.</p>
          <p>O Genvity não substitui atendimento médico e não é serviço de emergência. Em urgências, ligue 192.</p>
        </div>
      </div>
    </footer>
  );
}
