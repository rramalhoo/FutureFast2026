import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-h1 font-semibold">Termos de uso</h1>
      <Alert tone="warning" className="mt-6" title="Minuta para revisão jurídica">
        Este texto é uma base de trabalho e deve ser revisado por assessoria jurídica antes do lançamento.
      </Alert>
      <div className="mt-8 space-y-6 text-[0.9375rem] leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-h3 [&_h2]:font-semibold [&_h2]:text-foreground-strong">
        <h2>1. O serviço</h2>
        <p>O Genvity é uma plataforma que organiza informações de saúde e conecta pacientes, médicos e farmácias. Não presta serviços médicos ou farmacêuticos e não é canal de emergência.</p>
        <h2>2. Contas e verificação</h2>
        <p>Médicos e farmácias passam por verificação antes de acessar recursos restritos. O usuário é responsável pela veracidade dos dados informados e pelo sigilo de suas credenciais.</p>
        <h2>3. Responsabilidades profissionais</h2>
        <p>Decisões clínicas são de responsabilidade exclusiva do médico. A dispensação depende da conferência do farmacêutico e do cumprimento das normas sanitárias. Ferramentas de inteligência artificial são apenas de apoio e exigem revisão humana.</p>
        <h2>4. Prescrições</h2>
        <p>A validade jurídica de prescrições eletrônicas depende de assinatura digital qualificada e das regras aplicáveis. Prescrições emitidas não podem ser alteradas; correções exigem cancelamento e nova emissão.</p>
        <h2>5. Planos e pagamentos</h2>
        <p>Valores são informados na página de planos. Enquanto o meio de pagamento não estiver integrado, nenhuma cobrança é realizada.</p>
        <h2>6. Uso adequado</h2>
        <p>É proibido acessar ou tentar acessar dados de terceiros sem autorização, burlar controles de segurança ou utilizar a plataforma para fins ilícitos.</p>
      </div>
    </article>
  );
}
