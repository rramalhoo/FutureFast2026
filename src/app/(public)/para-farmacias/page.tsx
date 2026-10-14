import type { Metadata } from "next";
import { Boxes, ClipboardCheck, Inbox, LineChart, QrCode, ShieldCheck } from "lucide-react";
import { AudiencePage } from "@/components/marketing/audience-page";

export const metadata: Metadata = { title: "Para farmácias" };

export default function ForPharmaciesPage() {
  return (
    <AudiencePage
      eyebrow="Para farmácias"
      title={<>Atendimento ágil, <span className="text-gradient-brand">conferência segura.</span></>}
      description="Consulte receitas pelo QR Code, verifique integridade e validade, organize a separação e informe o paciente."
      signupRole="pharmacy"
      features={[
        { icon: QrCode, title: "Leitura de QR Code", description: "Câmera do computador ou celular. A consulta é autenticada, limitada e registrada." },
        { icon: ShieldCheck, title: "Integridade e validade", description: "Hash de integridade, situação, validade e dados do prescritor verificados automaticamente." },
        { icon: ClipboardCheck, title: "Conferência farmacêutica", description: "O sistema apoia — não substitui — a conferência e as exigências legais da dispensação." },
        { icon: Inbox, title: "Solicitações dos pacientes", description: "Receba pedidos, atualize o andamento e avise quando estiver pronto para retirada." },
        { icon: Boxes, title: "Disponibilidade de produtos", description: "Cadastro e atualização de estoque, preparado para integração com seu sistema." },
        { icon: LineChart, title: "Indicadores de atendimento", description: "Solicitações, conferências e dispensações registradas no período." },
      ]}
      steps={[
        "Crie a conta da farmácia e confirme o e-mail.",
        "Informe CNPJ, AFE, responsável técnico e envie a documentação.",
        "Após a verificação, cadastre seus produtos e disponibilidade.",
        "Comece a receber solicitações e a conferir receitas.",
      ]}
      notes={[
        { title: "Disponibilidade honesta", text: "Pacientes veem somente o que sua farmácia informou, com a data da última atualização." },
        { title: "Integrações", text: "Preparado para sincronização com sistemas de gestão. A integração é configurada no plano Genvity Farmácias." },
      ]}
    />
  );
}
