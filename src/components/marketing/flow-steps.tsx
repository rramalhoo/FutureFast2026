"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Building2, ClipboardList, FileSignature, HeartPulse, Pill, QrCode, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const steps: { icon: LucideIcon; who: string; title: string; text: string }[] = [
  { icon: ClipboardList, who: "Médico", title: "Registra a consulta", text: "Acessa apenas pacientes vinculados e o histórico que eles autorizaram compartilhar." },
  { icon: FileSignature, who: "Médico", title: "Prescreve e assina", text: "Itens, doses e orientações são revisados e selados com hash de integridade antes da assinatura." },
  { icon: HeartPulse, who: "Paciente", title: "Recebe na conta", text: "A receita chega ao app com QR Code seguro, e os medicamentos entram no acompanhamento." },
  { icon: Pill, who: "Paciente", title: "Acompanha o tratamento", text: "Lembretes nos horários e registro de doses tomadas — sem alterar o que foi prescrito." },
  { icon: QrCode, who: "Farmácia", title: "Verifica a receita", text: "Somente farmácias verificadas consultam o QR. Cada acesso é registrado e informado ao paciente." },
  { icon: Building2, who: "Farmácia", title: "Confere e dispensa", text: "O farmacêutico faz a conferência exigida e registra a conclusão operacional." },
];

export function FlowSteps() {
  const [active, setActive] = React.useState(0);
  const step = steps[active]!;
  const Icon = step.icon;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.title}>
            <button
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              aria-current={active === i ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition-all",
                active === i ? "border-primary/40 bg-surface shadow-md" : "border-transparent hover:bg-surface/60",
              )}
            >
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold tabular", active === i ? "bg-primary text-primary-foreground" : "bg-surface-sunken text-muted-foreground")}>
                {i + 1}
              </span>
              <span>
                <span className="block text-caption font-medium text-primary">{s.who}</span>
                <span className="block font-medium text-foreground-strong">{s.title}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="surface-card relative min-h-72 overflow-hidden p-8">
        <div className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-primary-soft blur-3xl" aria-hidden />
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
            aria-live="polite"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(140deg,#9448bd,#6e2b94)] text-white shadow-glow">
              <Icon className="size-7" aria-hidden />
            </span>
            <p className="mt-6 text-sm font-semibold text-primary">Etapa {active + 1} · {step.who}</p>
            <h3 className="mt-1 text-h2 font-semibold">{step.title}</h3>
            <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">{step.text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
