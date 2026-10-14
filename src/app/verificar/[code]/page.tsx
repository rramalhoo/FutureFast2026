import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { loadMyPharmacy } from "@/server/queries/pharmacy";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { PrescriptionLookup } from "@/components/pharmacy/prescription-lookup";

export const metadata: Metadata = { title: "Verificação de receita", robots: { index: false, follow: false } };

/**
 * Destino do QR Code. Não exibe nenhum dado sem autenticação de uma farmácia
 * verificada — a consulta real acontece via função auditada no banco.
 */
export default async function VerifyPage({ params }: PageProps<"/verificar/[code]">) {
  const { code } = await params;
  const session = await getSession();
  const pharmacy = session?.profile.role === "pharmacy" ? await loadMyPharmacy(session.userId) : null;
  const authorized = pharmacy?.verification_status === "approved";

  if (authorized) {
    return (
      <main id="conteudo" className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <div className="flex items-center justify-between"><Logo href="/farmacia" /><Button asChild variant="secondary"><Link href="/farmacia">Painel</Link></Button></div>
        <h1 className="text-h1 font-semibold">Verificação de receita</h1>
        <PrescriptionLookup initialCode={code} defaultPharmacist={{ name: pharmacy.technical_responsible, crf: pharmacy.technical_responsible_crf }} />
      </main>
    );
  }

  return (
    <main id="conteudo" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
      <Logo />
      <div className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft text-primary"><ShieldCheck className="size-8" aria-hidden /></div>
      <div className="max-w-md space-y-2">
        <h1 className="text-h2 font-semibold">Receita digital protegida</h1>
        <p className="text-muted-foreground">
          Esta receita só pode ser consultada por farmácias verificadas no Genvity. Nenhuma informação médica é exibida por este link.
        </p>
      </div>
      {session ? (
        <p className="text-sm text-muted-foreground">Sua conta não tem permissão para consultar receitas.</p>
      ) : (
        <Button asChild><Link href={`/login?next=${encodeURIComponent(`/verificar/${code}`)}`}>Entrar como farmácia</Link></Button>
      )}
    </main>
  );
}
