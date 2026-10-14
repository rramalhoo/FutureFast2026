import Link from "next/link";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/motion";
import { CtaBand, FeatureCard, PageHero, SectionHeading } from "./sections";

export function AudiencePage({
  eyebrow,
  title,
  description,
  signupRole,
  features,
  steps,
  notes,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  signupRole: "patient" | "doctor" | "pharmacy";
  features: { icon: LucideIcon; title: string; description: string }[];
  steps: string[];
  notes: { title: string; text: string }[];
}) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} description={description}>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={`/cadastro?perfil=${signupRole}`}>
              Criar conta <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/planos">Ver planos</Link>
          </Button>
        </div>
      </PageHero>
      <section className="px-5 py-12">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={(i % 3) * 0.05} />
          ))}
        </div>
      </section>
      <section className="px-5 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <SectionHeading align="left" eyebrow="Primeiros passos" title="Comece em poucos minutos." />
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <Reveal key={s} delay={i * 0.05} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground tabular">{i + 1}</span>
                <span className="pt-1 text-[0.9375rem]">{s}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
      <section className="px-5 pb-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {notes.map((n) => (
            <Reveal key={n.title} className="rounded-[1.5rem] border border-border bg-surface-muted p-6">
              <h3 className="flex items-center gap-2 font-semibold text-foreground-strong">
                <Check className="size-4 text-success" aria-hidden /> {n.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.text}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <CtaBand title="Pronto para começar?" description="Crie sua conta e conheça o Genvity na prática." />
    </>
  );
}
