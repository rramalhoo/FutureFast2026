"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dialog as D } from "radix-ui";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updatePreferencesAction } from "@/server/actions/account";
import type { UserRole } from "@/lib/supabase/types";

const STEPS: Record<UserRole, { title: string; text: string }[]> = {
  patient: [
    { title: "Bem-vindo ao Genvity", text: "Aqui você organiza receitas, medicamentos, consultas e seu histórico de saúde." },
    { title: "Medicamentos e lembretes", text: "Na página Medicamentos você vê os horários e registra cada dose tomada ou pulada." },
    { title: "Você controla seus dados", text: "Em Minha conta → Privacidade, escolha o que cada médico pode ver e acompanhe os acessos." },
    { title: "Atalhos", text: "Use Ctrl+K para pesquisar qualquer página. Em caso de emergência, ligue 192." },
  ],
  doctor: [
    { title: "Bem-vindo(a), doutor(a)", text: "Este é seu ambiente de produtividade clínica no Genvity." },
    { title: "Configure sua agenda", text: "Em Agenda, defina horários e modalidades para que pacientes possam agendar." },
    { title: "Pacientes e prescrições", text: "Pacientes vinculados aparecem em Pacientes. Prescrições passam por revisão e assinatura antes da emissão." },
    { title: "Atalhos", text: "Use Ctrl+K para encontrar pacientes e prescrições rapidamente." },
  ],
  pharmacy: [
    { title: "Bem-vindo ao painel da farmácia", text: "Consulte receitas, gerencie solicitações e informe sua disponibilidade." },
    { title: "Leitor de QR Code", text: "Aponte a câmera para o QR da receita. Cada consulta é registrada e informada ao paciente." },
    { title: "Estoque honesto", text: "Pacientes veem apenas o que você informar em Estoque, com a data da atualização." },
  ],
  admin: [{ title: "Administração Genvity", text: "Verificações, usuários, assinaturas e auditoria em um só lugar." }],
};

export function WelcomeTour({ role, show }: { role: UserRole; show: boolean }) {
  const [open, setOpen] = React.useState(show);
  const [step, setStep] = React.useState(0);
  const steps = STEPS[role];
  const current = steps[step]!;

  async function finish() {
    setOpen(false);
    await updatePreferencesAction({ tourDone: true });
  }

  return (
    <D.Root open={open} onOpenChange={(v) => (v ? setOpen(true) : void finish())}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-[rgb(20_12_26/0.45)] backdrop-blur-[3px]" />
        <D.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-lg data-[state=open]:[animation:gv-pop_240ms_cubic-bezier(0.22,1,0.36,1)]">
          <div className="relative h-32 bg-[radial-gradient(120%_120%_at_0%_0%,#a35bcc_0%,#7d35a5_50%,#3d1656_100%)]">
            <div className="bg-grid absolute inset-0 opacity-10" aria-hidden />
            <Sparkles className="absolute bottom-5 left-6 size-9 text-white" aria-hidden />
          </div>
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
                <D.Title className="text-h2 font-semibold">{current.title}</D.Title>
                <D.Description className="mt-2 leading-relaxed text-muted-foreground">{current.text}</D.Description>
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1.5" aria-label={`Passo ${step + 1} de ${steps.length}`}>
                {steps.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border-strong"}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={finish}>Pular</Button>
                {step < steps.length - 1 ? (
                  <Button size="sm" onClick={() => setStep((s) => s + 1)}>Próximo <ArrowRight /></Button>
                ) : (
                  <Button size="sm" onClick={finish}>Começar</Button>
                )}
              </div>
            </div>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
