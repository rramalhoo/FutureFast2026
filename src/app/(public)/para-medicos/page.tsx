import type { Metadata } from "next";
import { Bot, CalendarDays, ClipboardList, FileSignature, MessagesSquare, Users } from "lucide-react";
import { AudiencePage } from "@/components/marketing/audience-page";

export const metadata: Metadata = { title: "Para médicos" };

export default function ForDoctorsPage() {
  return (
    <AudiencePage
      eyebrow="Para médicos"
      title={<>Menos burocracia, <span className="text-gradient-brand">mais tempo de cuidado.</span></>}
      description="Agenda, pacientes, registro de consultas e prescrição digital em uma interface de produtividade clínica."
      signupRole="doctor"
      features={[
        { icon: CalendarDays, title: "Agenda profissional", description: "Horários de atendimento, bloqueios, confirmações e remarcações sem conflitos." },
        { icon: Users, title: "Pacientes vinculados", description: "Perfil, alergias e prescrições anteriores — e o histórico completo quando o paciente autorizar." },
        { icon: ClipboardList, title: "Registro de consultas", description: "Resumo para o paciente, observações clínicas privadas ou compartilhadas e retornos." },
        { icon: FileSignature, title: "Prescrição digital", description: "Rascunho, revisão, hash de integridade e assinatura. Estados claros: rascunho, aguardando assinatura, emitida." },
        { icon: MessagesSquare, title: "Mensagens organizadas", description: "Comunicação segura por paciente, que você habilita quando quiser." },
        { icon: Bot, title: "Assistente de produtividade", description: "Tarefas, resumos de textos que você fornece e rascunhos administrativos. Nunca decide por você." },
      ]}
      steps={[
        "Crie sua conta profissional e confirme seu e-mail.",
        "Envie CRM, UF e documentos para verificação pela equipe Genvity.",
        "Configure seus horários e modalidades de atendimento.",
        "Receba pacientes, registre consultas e prescreva.",
      ]}
      notes={[
        { title: "Assinatura com validade jurídica", text: "A emissão juridicamente válida depende da integração com provedor de assinatura ICP-Brasil. Até lá, a plataforma sinaliza a ausência de validade." },
        { title: "Busca justa", text: "Pacientes encontram médicos por especialidade, região e disponibilidade. Não há destaque pago na busca." },
      ]}
    />
  );
}
