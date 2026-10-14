import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { fmt } from "@/lib/format";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function SectionHeading({ eyebrow, title, description, align = "center" }: { eyebrow?: string; title: React.ReactNode; description?: React.ReactNode; align?: "center" | "left" }) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <p className="text-sm font-semibold text-primary">{eyebrow}</p> : null}
      <h2 className="mt-2 text-[2rem] leading-[1.12] font-semibold tracking-[-0.03em] text-balance sm:text-[2.5rem]">{title}</h2>
      {description ? <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p> : null}
    </Reveal>
  );
}

export function FeatureCard({ icon: Icon, title, description, className, delay = 0 }: { icon: LucideIcon; title: string; description: string; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={cn("surface-card group p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-md", className)}>
      <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-5 text-h3 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </Reveal>
  );
}

export function CtaBand({ title, description }: { title: string; description: string }) {
  return (
    <section className="px-5 py-20">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[radial-gradient(120%_120%_at_0%_0%,#a35bcc_0%,#7d35a5_45%,#3d1656_100%)] px-6 py-14 text-center text-white sm:px-12">
        <div className="bg-grid absolute inset-0 opacity-[0.08]" aria-hidden />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-[2rem] leading-tight font-semibold tracking-[-0.03em] text-white sm:text-[2.5rem]">{title}</h2>
          <p className="mt-4 text-lg text-white/80">{description}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-brand-700 shadow-none hover:bg-white/90 hover:shadow-none">
              <Link href="/cadastro">
                Criar conta gratuita <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/planos">Ver planos</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function priceLabel(plan: Tables<"plans">) {
  if (plan.custom_pricing) return { main: "Sob consulta", note: "Preço personalizado" };
  if (!plan.price_min_cents) return { main: "Gratuito", note: plan.audience === "patient" ? "Para sempre" : "Para profissionais elegíveis" };
  if (plan.price_max_cents && plan.price_max_cents !== plan.price_min_cents) {
    return { main: `${fmt.currency(plan.price_min_cents)}`, note: `a ${fmt.currency(plan.price_max_cents)} por mês` };
  }
  return { main: `${fmt.currency(plan.price_min_cents)}`, note: plan.audience === "clinic" ? "a partir de, por mês" : "por mês" };
}

const audienceLabel: Record<string, string> = { patient: "Pacientes", doctor: "Médicos", clinic: "Clínicas", pharmacy: "Farmácias" };

export function PlansGrid({ plans }: { plans: Tables<"plans">[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {plans.map((plan, i) => {
        const price = priceLabel(plan);
        const highlight = plan.slug === "pro";
        return (
          <Reveal
            key={plan.id}
            delay={i * 0.05}
            className={cn(
              "relative flex flex-col rounded-[1.5rem] border p-6",
              highlight ? "border-primary bg-surface shadow-glow" : "border-border bg-surface shadow-sm",
            )}
          >
            {highlight ? (
              <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Mais completo
              </span>
            ) : null}
            <p className="text-caption font-medium text-muted-foreground uppercase">{audienceLabel[plan.audience]}</p>
            <h3 className="mt-1 text-h3 font-semibold">{plan.name}</h3>
            <p className="mt-4 text-[1.75rem] leading-none font-semibold tracking-tight text-foreground-strong tabular">{price.main}</p>
            <p className="mt-1 text-caption text-muted-foreground">{price.note}</p>
            <p className="mt-4 text-sm text-muted-foreground">{plan.description}</p>
            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}
                </li>
              ))}
            </ul>
            <Button asChild variant={highlight ? "primary" : "secondary"} className="mt-6" block>
              <Link href={`/cadastro?perfil=${plan.audience === "clinic" ? "doctor" : plan.audience}`}>
                {plan.custom_pricing ? "Falar com a equipe" : "Começar"}
              </Link>
            </Button>
          </Reveal>
        );
      })}
    </div>
  );
}

export function PageHero({ eyebrow, title, description, children }: { eyebrow: string; title: React.ReactNode; description: string; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden px-5 pt-16 pb-12 sm:pt-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--primary-soft),transparent)]" aria-hidden />
      <div className="relative mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-primary shadow-xs">{eyebrow}</p>
          <h1 className="mt-6 text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-display">{title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{description}</p>
        </Reveal>
        {children ? <Reveal delay={0.1} className="mt-8">{children}</Reveal> : null}
      </div>
    </section>
  );
}
