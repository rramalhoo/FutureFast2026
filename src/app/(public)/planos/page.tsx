import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { PageHero, PlansGrid } from "@/components/marketing/sections";
import { Faq } from "@/components/marketing/faq";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Planos" };

export default async function PlansPage() {
  const supabase = await getServerSupabase();
  const { data: plans } = await supabase.from("plans").select("*").eq("is_active", true).order("sort_order");
  return (
    <>
      <PageHero
        eyebrow="Planos"
        title="Planos para cada etapa."
        description="Pacientes usam o essencial gratuitamente. Profissionais escolhem o nível de ferramentas de que precisam."
      />
      <section className="px-5 pb-16">
        <div className="mx-auto max-w-6xl space-y-8">
          <PlansGrid plans={plans ?? []} />
          <Alert tone="info" title="Sobre cobrança">
            Os valores são referências comerciais e podem mudar. A integração com o meio de pagamento ainda não está
            ativa: escolher um plano pago registra o interesse e nenhuma cobrança é realizada.
          </Alert>
        </div>
      </section>
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-3xl">
          <Faq
            items={[
              { q: "Quem pode usar o Genvity Básico?", a: "Médicos com CRM ativo verificados pela equipe Genvity." },
              { q: "Posso mudar de plano?", a: "Sim, a qualquer momento em Minha conta → Plano." },
              { q: "Como funciona o plano para farmácias?", a: "O preço depende do porte e das integrações. Ao escolher, nossa equipe entra em contato." },
            ]}
          />
        </div>
      </section>
    </>
  );
}
