"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Apenas o digest — sem detalhes que possam conter dados pessoais.
    console.error("[genvity] erro de renderização", error.digest);
  }, [error]);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-5 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <TriangleAlert className="size-7" aria-hidden />
      </div>
      <div>
        <h1 className="text-h2 font-semibold">Algo não saiu como esperado</h1>
        <p className="mt-2 max-w-md text-muted-foreground">Não foi possível carregar esta página. Tente novamente em instantes.</p>
        {error.digest ? <p className="mt-2 text-caption text-subtle-foreground">Código: {error.digest}</p> : null}
      </div>
      <Button onClick={reset}>
        <RefreshCw /> Tentar novamente
      </Button>
    </div>
  );
}
