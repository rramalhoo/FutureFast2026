import Link from "next/link";
import {
  Accessibility,
  ArrowRight,
  BellRing,
  Bot,
  Building2,
  CalendarDays,
  Eye,
  Fingerprint,
  HeartPulse,
  Lock,
  MapPin,
  MessagesSquare,
  QrCode,
  ScanLine,
  ScrollText,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn, Reveal } from "@/components/ui/motion";
import { HeroMockup } from "@/components/marketing/hero-mockup";
import { CtaBand, FeatureCard, PlansGrid, SectionHeading } from "@/components/marketing/sections";
import { FlowSteps } from "@/components/marketing/flow-steps";
import { Faq } from "@/components/marketing/faq";
import { getServerSupabase } from "@/lib/supabase/server";
import { faqItems } from "@/components/marketing/faq-data";



export default async function LandingPage() {
  const supabase = await getServerSupabase();
  const { data: plans } = await supabase.from("plans").select("*").eq("is_active", true).order("sort_order");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-5 pt-10 pb-20 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_70%_10%,rgb(148_72_189/0.16),transparent),radial-gradient(50%_40%_at_10%_30%,rgb(234_216_243/0.7),transparent)] dark:bg-[radial-gradient(70%_50%_at_70%_10%,rgb(148_72_189/0.22),transparent)]" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <FadeIn>
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-xs backdrop-blur">
              <span className="size-1.5 rounded-full bg-success" aria-hidden /> Plataforma de saúde conectada
            </p>
            <h1 className="mt-6 text-[2.75rem] leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:text-[3.75rem]">
              Do consultório à farmácia, <span className="text-gradient-brand">um só cuidado.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              O Genvity conecta médicos, pacientes e farmácias: receitas digitais verificáveis, acompanhamento de
              medicamentos, agenda e histórico de saúde — com privacidade e segurança desde a base.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/cadastro">
                  Criar conta gratuita <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/funcionalidades">Conhecer a plataforma</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Gratuito para pacientes", "Profissionais verificados", "Você controla seus dados"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-success" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </FadeIn>
          <div>
            <HeroMockup />
            <p className="mt-2 text-center text-caption text-subtle-foreground">Ilustração da interface</p>
          </div>
        </div>
      </section>

      {/* Três ambientes */}
      <section className="px-5 py-20" id="ambientes">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Três ambientes, um ecossistema"
            title="Cada pessoa vê exatamente o que precisa."
            description="Interfaces dedicadas, permissões próprias e dados que só circulam com autorização."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: HeartPulse,
                who: "Pacientes",
                href: "/para-pacientes",
                text: "Receitas, medicamentos, lembretes, consultas e histórico organizados em um app acolhedor e acessível.",
                bullets: ["Próxima dose sempre visível", "Calendário de saúde", "Busca de médicos e farmácias"],
              },
              {
                icon: Stethoscope,
                who: "Médicos",
                href: "/para-medicos",
                text: "Agenda, pacientes vinculados, registro de consultas e prescrição digital em um fluxo de trabalho enxuto.",
                bullets: ["Prescrição com revisão e assinatura", "Histórico autorizado", "Assistente de produtividade"],
              },
              {
                icon: Building2,
                who: "Farmácias",
                href: "/para-farmacias",
                text: "Leitura de QR Code, verificação de integridade e validade, estoque e solicitações em um painel ágil.",
                bullets: ["Conferência auditada", "Fluxo de separação", "Disponibilidade informada"],
              },
            ].map((env, i) => (
              <Reveal key={env.who} delay={i * 0.08} className="surface-card group flex flex-col p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-md">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(140deg,#9448bd,#6e2b94)] text-white shadow-glow">
                  <env.icon className="size-6" aria-hidden />
                </span>
                <h3 className="mt-6 text-h2 font-semibold">{env.who}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{env.text}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {env.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary" aria-hidden /> {b}
                    </li>
                  ))}
                </ul>
                <Link href={env.href} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Saiba mais <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Fluxo */}
      <section className="bg-surface-muted px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Como funciona"
            title="Uma receita, do início ao fim, sem papel perdido."
            description="Veja como médico, paciente e farmácia participam do mesmo fluxo — cada um com sua parte e suas permissões."
          />
          <div className="mt-12">
            <FlowSteps />
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Funcionalidades" title="Feito para o dia a dia do cuidado." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={BellRing} title="Lembretes inteligentes" description="Horários organizados por tratamento, com registro de doses tomadas ou puladas." />
            <FeatureCard icon={CalendarDays} title="Calendário de saúde" description="Medicamentos, consultas, retornos e lembretes por dia, semana ou mês." delay={0.05} />
            <FeatureCard icon={QrCode} title="QR Code seguro" description="Aponta para uma verificação autenticada — nunca expõe dados médicos." delay={0.1} />
            <FeatureCard icon={ScanLine} title="Leitor auxiliar de receitas" description="Lê receitas em papel com OCR, sinaliza trechos incertos e exige sua confirmação." delay={0.15} />
            <FeatureCard icon={MessagesSquare} title="Mensagens seguras" description="Conversa com seu médico quando o serviço estiver habilitado. Não é canal de emergência." />
            <FeatureCard icon={MapPin} title="Farmácias próximas" description="Mapa, distância e disponibilidade informada pelo estoque integrado, com data de atualização." delay={0.05} />
            <FeatureCard icon={Bot} title="Assistente para médicos" description="Organiza tarefas e rascunhos administrativos. Ferramenta de apoio, sempre com revisão humana." delay={0.1} />
            <FeatureCard icon={Accessibility} title="Acessível de verdade" description="Fonte ampliada, alto contraste, menos movimento e modo escuro — pensado para todas as idades." delay={0.15} />
          </div>
        </div>
      </section>

      {/* Diferenciais / segurança */}
      <section className="px-5 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            align="left"
            eyebrow="Privacidade por padrão"
            title="Segurança não é um recurso. É a fundação."
            description="Dados de saúde são sensíveis. Por isso o Genvity foi construído com isolamento de dados no banco, consentimento granular e transparência sobre cada acesso."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Lock, t: "Isolamento no banco de dados", d: "Políticas de acesso por linha (RLS) impedem que uma conta veja dados de outra." },
              { icon: Fingerprint, t: "Consentimento granular", d: "Você escolhe o que cada médico pode ver e revoga quando quiser." },
              { icon: Eye, t: "Transparência de acessos", d: "Veja quando um profissional ou farmácia consultou seus dados." },
              { icon: ScrollText, t: "Trilha de auditoria", d: "Emissões, verificações e dispensações ficam registradas de forma imutável." },
            ].map(({ icon: Icon, t, d }, i) => (
              <Reveal key={t} delay={i * 0.06} className="rounded-[1.5rem] border border-border bg-surface p-5">
                <Icon className="size-5 text-primary" aria-hidden />
                <h3 className="mt-4 font-semibold text-foreground-strong">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="bg-surface-muted px-5 py-20" id="planos">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Planos"
            title="Gratuito para pacientes. Justo para profissionais."
            description="Valores de referência. Nenhuma cobrança é feita até a integração com o meio de pagamento ser ativada."
          />
          <div className="mt-12">
            <PlansGrid plans={plans ?? []} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-3xl">
          <SectionHeading eyebrow="Perguntas frequentes" title="Dúvidas comuns" />
          <div className="mt-10">
            <Faq items={faqItems} />
          </div>
        </div>
      </section>

      <CtaBand title="Comece a organizar seu cuidado hoje." description="Crie sua conta em poucos minutos. Profissionais passam por verificação antes de acessar recursos clínicos." />
    </>
  );
}
