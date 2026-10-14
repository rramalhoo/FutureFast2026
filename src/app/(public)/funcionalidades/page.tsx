import type { Metadata } from "next";
import {
  Accessibility, BadgeCheck, BellRing, Bot, Boxes, CalendarDays, ClipboardList, FileSignature, History,
  Inbox, MapPin, MessagesSquare, Moon, QrCode, ScanLine, Search, ShieldCheck, Users,
} from "lucide-react";
import { CtaBand, FeatureCard, PageHero, SectionHeading } from "@/components/marketing/sections";

export const metadata: Metadata = { title: "Funcionalidades" };

const groups = [
  {
    title: "Pacientes",
    items: [
      { icon: BellRing, title: "Medicamentos e lembretes", description: "Organização por tratamento, horários e registro de doses." },
      { icon: CalendarDays, title: "Calendário inteligente", description: "Dia, semana e mês com medicamentos, consultas e retornos." },
      { icon: History, title: "Histórico de saúde", description: "Consultas, receitas, alergias, observações compartilhadas e documentos." },
      { icon: ScanLine, title: "Leitor auxiliar (OCR)", description: "Leitura de receitas em papel com confirmação humana obrigatória." },
      { icon: MapPin, title: "Busca de farmácias", description: "Mapa, distância e disponibilidade informada." },
      { icon: Search, title: "Busca de médicos", description: "Por nome, especialidade, região, modalidade e disponibilidade." },
    ],
  },
  {
    title: "Médicos",
    items: [
      { icon: Users, title: "Gestão de pacientes", description: "Perfis autorizados, alergias, prescrições e acompanhamentos." },
      { icon: ClipboardList, title: "Consultas", description: "Registro de atendimento, notas clínicas e retornos." },
      { icon: FileSignature, title: "Prescrição digital", description: "Estados de rascunho, assinatura, emissão, cancelamento e expiração." },
      { icon: CalendarDays, title: "Agenda", description: "Horários, bloqueios, confirmação e remarcação." },
      { icon: MessagesSquare, title: "Mensagens", description: "Comunicação segura por paciente." },
      { icon: Bot, title: "Assistente", description: "Tarefas, resumos e rascunhos — sempre revisados por você." },
    ],
  },
  {
    title: "Farmácias",
    items: [
      { icon: QrCode, title: "Leitor de QR Code", description: "Consulta autenticada e auditada da receita." },
      { icon: ShieldCheck, title: "Verificações automáticas", description: "Integridade, status, validade e dados do prescritor." },
      { icon: Inbox, title: "Solicitações", description: "Fluxo de conferência, separação e retirada." },
      { icon: Boxes, title: "Estoque", description: "Produtos e disponibilidade com data de atualização." },
      { icon: BadgeCheck, title: "Cadastro verificado", description: "CNPJ, AFE e responsável técnico conferidos." },
      { icon: Accessibility, title: "Interface ágil", description: "Pensada para o balcão: rápida no desktop e no celular." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero
        eyebrow="Funcionalidades"
        title="Tudo o que o cuidado precisa, conectado."
        description="Um conjunto coerente de ferramentas para cada ambiente, compartilhando dados apenas quando há autorização."
      />
      {groups.map((g) => (
        <section key={g.title} className="px-5 py-12">
          <div className="mx-auto max-w-6xl">
            <SectionHeading align="left" eyebrow={g.title} title={`Para ${g.title.toLowerCase()}`} />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((f, i) => (
                <FeatureCard key={f.title} {...f} delay={(i % 3) * 0.05} />
              ))}
            </div>
          </div>
        </section>
      ))}
      <section className="px-5 py-12">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          <FeatureCard icon={Moon} title="Modo claro e escuro" description="Escolha o tema ou siga o sistema." />
          <FeatureCard icon={Accessibility} title="Acessibilidade" description="Fonte ampliada, alto contraste e redução de movimento." delay={0.05} />
          <FeatureCard icon={Search} title="Pesquisa global" description="Ctrl+K para encontrar páginas e registros que você pode acessar." delay={0.1} />
        </div>
      </section>
      <CtaBand title="Veja na prática." description="Crie uma conta gratuita e explore o ambiente do seu perfil." />
    </>
  );
}
