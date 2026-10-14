import type { Metadata } from "next";
import { HeartHandshake, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { CtaBand, FeatureCard, PageHero, SectionHeading } from "@/components/marketing/sections";

export const metadata: Metadata = { title: "Sobre o Genvity" };

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Sobre o Genvity"
        title="Cuidado contínuo começa com informação conectada."
        description="Receitas perdidas, horários esquecidos, histórico fragmentado e processos manuais tornam o cuidado mais difícil do que precisa ser. O Genvity existe para conectar quem cuida e quem é cuidado."
      />
      <section className="px-5 py-12">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow="Princípios" title="O que guia cada decisão de produto." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={ShieldCheck} title="Privacidade primeiro" description="Dados de saúde só circulam com autorização explícita e registrada." />
            <FeatureCard icon={HeartHandshake} title="Pessoas no centro" description="Tecnologia apoia médicos e farmacêuticos; nunca os substitui." delay={0.05} />
            <FeatureCard icon={Scale} title="Neutralidade" description="Sem destaque pago na busca de profissionais ou farmácias." delay={0.1} />
            <FeatureCard icon={Sparkles} title="Simplicidade" description="Interfaces claras e acessíveis para todas as idades." delay={0.15} />
          </div>
        </div>
      </section>
      <section className="px-5 py-12">
        <div className="mx-auto max-w-3xl space-y-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
          <h2 className="text-h2 font-semibold">Responsabilidade regulatória</h2>
          <p>
            O Genvity foi projetado considerando a LGPD, as normas de prescrição eletrônica e as regras de dispensação
            farmacêutica. A conformidade, porém, não é garantida apenas pela tecnologia: recursos como a assinatura
            digital com validade jurídica dependem de integrações certificadas e de validação jurídica e regulatória
            antes do uso em produção. Sempre que um recurso depender de integração ainda não ativa, a interface
            informa isso com clareza.
          </p>
        </div>
      </section>
      <CtaBand title="Faça parte do Genvity." description="Pacientes, médicos e farmácias são bem-vindos." />
    </>
  );
}
