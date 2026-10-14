"use client";

import { motion, useReducedMotion } from "motion/react";
import { BadgeCheck, Bell, CalendarDays, Check, FileSignature, Pill, QrCode, ShieldCheck } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

function Float({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 30, scale: 0.96 }}
      animate={reduce ? undefined : { opacity: 1, y: [0, -8, 0], scale: 1 }}
      transition={
        reduce
          ? undefined
          : {
              opacity: { duration: 0.7, delay, ease },
              scale: { duration: 0.7, delay, ease },
              y: { duration: 6, delay: delay + 0.7, repeat: Infinity, ease: "easeInOut" },
            }
      }
    >
      {children}
    </motion.div>
  );
}

/** Ilustração da interface (sem dados reais). */
export function HeroMockup() {
  return (
    <div className="relative mx-auto aspect-[1/1] w-full max-w-[600px] sm:aspect-[6/5]" aria-hidden>
      <div className="absolute inset-[4%] bg-[radial-gradient(closest-side,rgb(148_72_189/0.28),transparent)]" />

      {/* Painel do médico */}
      <Float delay={0.1} className="absolute top-0 left-0 w-[62%]">
        <div className="rounded-[1.6rem] border border-border bg-surface p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <FileSignature className="size-4" />
              </span>
              <div>
                <p className="text-[0.7rem] text-muted-foreground">Nova prescrição</p>
                <p className="text-sm font-semibold text-foreground-strong">Revisão final</p>
              </div>
            </div>
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[0.65rem] font-medium text-warning-foreground">
              Aguardando assinatura
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { n: "Medicamento A", d: "1 comprimido · 12/12h", w: "7 dias" },
              { n: "Medicamento B", d: "1 cápsula · 1x ao dia", w: "Uso contínuo" },
            ].map((i) => (
              <div key={i.n} className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2.5">
                <Pill className="size-4 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8rem] font-medium text-foreground-strong">{i.n}</p>
                  <p className="text-[0.68rem] text-muted-foreground">{i.d}</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[0.65rem] font-medium text-primary-soft-foreground">{i.w}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[linear-gradient(120deg,#7d35a5,#9448bd)] px-3 py-2.5 text-white">
            <span className="text-[0.75rem] font-medium">Assinar com certificado digital</span>
            <ShieldCheck className="size-4" />
          </div>
        </div>
      </Float>

      {/* App do paciente */}
      <Float delay={0.3} className="absolute right-0 bottom-0 w-[44%]">
        <div className="rounded-[2rem] border-[6px] border-[#1d1720] bg-surface p-3 shadow-lg dark:border-[#3a3240]">
          <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-border-strong" />
          <p className="text-[0.65rem] text-muted-foreground">Próximo medicamento</p>
          <div className="mt-1.5 rounded-2xl bg-[linear-gradient(140deg,#9448bd,#6e2b94)] p-3 text-white">
            <div className="flex items-center justify-between">
              <Pill className="size-4" />
              <span className="text-[0.65rem] opacity-80">em 25 min</span>
            </div>
            <p className="mt-2 text-sm font-semibold">Medicamento A</p>
            <p className="text-[0.68rem] opacity-80">1 comprimido · 14:00</p>
            <div className="mt-2.5 flex gap-1.5">
              <span className="flex-1 rounded-lg bg-white/20 py-1 text-center text-[0.65rem] font-medium">Tomei</span>
              <span className="flex-1 rounded-lg bg-white/10 py-1 text-center text-[0.65rem]">Pular</span>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            {[
              { i: CalendarDays, t: "Retorno agendado" },
              { i: Bell, t: "Lembretes ativos" },
            ].map(({ i: Icon, t }) => (
              <div key={t} className="flex items-center gap-2 rounded-xl bg-surface-muted px-2.5 py-2">
                <Icon className="size-3.5 text-primary" />
                <span className="text-[0.68rem] font-medium text-foreground">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </Float>

      {/* Farmácia */}
      <Float delay={0.5} className="absolute bottom-[2%] left-[4%] w-[44%]">
        <div className="rounded-[1.4rem] border border-border bg-surface p-3.5 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface-muted">
              <QrCode className="size-6 text-foreground-strong" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] text-muted-foreground">Farmácia autorizada</p>
              <p className="text-[0.8rem] font-semibold text-foreground-strong">Receita verificada</p>
            </div>
          </div>
          <div className="mt-2.5 grid gap-1.5">
            {["Integridade conferida", "Dentro da validade", "Prescritor verificado"].map((t) => (
              <div key={t} className="flex items-center gap-2 text-[0.68rem] text-success-foreground">
                <Check className="size-3.5" /> {t}
              </div>
            ))}
          </div>
        </div>
      </Float>

      <Float delay={0.7} className="absolute top-[6%] right-[4%]">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[0.7rem] font-medium text-foreground-strong shadow-md">
          <BadgeCheck className="size-3.5 text-success" /> CRM verificado
        </div>
      </Float>
    </div>
  );
}
