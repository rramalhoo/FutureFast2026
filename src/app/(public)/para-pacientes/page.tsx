import type { Metadata } from "next";
import { BellRing, CalendarDays, FileText, History, MapPin, ScanLine } from "lucide-react";
import { AudiencePage } from "@/components/marketing/audience-page";

export const metadata: Metadata = { title: "Para pacientes" };

export default function ForPatientsPage() {
  return (
    <AudiencePage
      eyebrow="Para pacientes"
      title={<>Seu tratamento, <span className="text-gradient-brand">simples e no seu controle.</span></>}
      description="Receitas, medicamentos, consultas e histórico de saúde organizados em um só lugar — gratuito e acessível."
      signupRole="patient"
      features={[
        { icon: BellRing, title: "Próxima dose sempre visível", description: "Saiba o que tomar e quando. Registre se tomou ou pulou — sem alterar a prescrição." },
        { icon: FileText, title: "Receitas digitais", description: "Receitas emitidas pelo seu médico chegam à sua conta com QR Code seguro para a farmácia." },
        { icon: CalendarDays, title: "Calendário de saúde", description: "Medicamentos, consultas, retornos e lembretes por dia, semana ou mês." },
        { icon: History, title: "Histórico organizado", description: "Consultas, receitas, alergias e documentos reunidos. Você decide quem pode ver." },
        { icon: MapPin, title: "Farmácias próximas", description: "Veja no mapa as farmácias e a disponibilidade informada por elas, com data de atualização." },
        { icon: ScanLine, title: "Leitor de receitas em papel", description: "Fotografe uma receita, revise o texto lido e organize seus medicamentos com sua confirmação." },
      ]}
      steps={[
        "Crie sua conta gratuita e confirme seu e-mail.",
        "Complete seu cadastro com dados básicos de identificação.",
        "Agende com um médico verificado ou aceite o convite do seu médico.",
        "Receba receitas, acompanhe os medicamentos e encontre farmácias.",
      ]}
      notes={[
        { title: "Você controla o compartilhamento", text: "O histórico completo e os documentos só são vistos por médicos que você autorizar. Revogue a qualquer momento." },
        { title: "Transparência total", text: "Você é avisado quando uma farmácia consulta sua receita e pode ver o registro de acessos aos seus dados." },
      ]}
    />
  );
}
