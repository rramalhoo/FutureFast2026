import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
      <Logo />
      <div className="flex size-16 items-center justify-center rounded-3xl bg-primary-soft text-primary">
        <Compass className="size-8" aria-hidden />
      </div>
      <div>
        <h1 className="text-h1 font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-muted-foreground">O endereço pode ter mudado ou você não tem acesso a este conteúdo.</p>
      </div>
      <Button asChild>
        <Link href="/entrar">Voltar ao início</Link>
      </Button>
    </main>
  );
}
