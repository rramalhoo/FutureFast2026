import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-h1 font-semibold">Política de privacidade</h1>
      <Alert tone="warning" className="mt-6" title="Minuta para revisão jurídica">
        Este texto descreve o funcionamento técnico atual e deve ser revisado pelo encarregado (DPO) e pela assessoria
        jurídica antes do lançamento.
      </Alert>
      <div className="mt-8 space-y-6 text-[0.9375rem] leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-h3 [&_h2]:font-semibold [&_h2]:text-foreground-strong">
        <h2>Dados que tratamos</h2>
        <p>Dados de cadastro (nome, e-mail, telefone, data de nascimento e, opcionalmente, CPF), dados profissionais (CRM, especialidade, CNPJ, AFE) e dados de saúde (consultas, prescrições, medicamentos, alergias, documentos e mensagens).</p>
        <h2>Finalidades e bases legais</h2>
        <p>Prestação do serviço, tutela da saúde e cumprimento de obrigações regulatórias. Dados de saúde são compartilhados com profissionais somente mediante consentimento do titular, que pode ser revogado a qualquer momento.</p>
        <h2>Compartilhamento</h2>
        <p>Médicos vinculados acessam dados básicos; histórico e documentos dependem de autorização específica. Farmácias verificadas acessam a receita apenas pelo código seguro ou quando o paciente envia uma solicitação. Todos os acessos sensíveis são registrados.</p>
        <h2>Segurança</h2>
        <p>Isolamento de dados por políticas no banco de dados, armazenamento privado de documentos com links temporários, criptografia em trânsito, limitação de requisições e trilha de auditoria.</p>
        <h2>Seus direitos</h2>
        <p>Em Minha conta → Privacidade você pode exportar seus dados, consultar o registro de acessos e solicitar correção ou exclusão. Algumas informações podem ser mantidas pelo prazo exigido por lei (por exemplo, registros de prescrição e dispensação).</p>
      </div>
    </article>
  );
}
