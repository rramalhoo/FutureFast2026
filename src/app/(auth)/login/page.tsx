import Link from "next/link";
import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "@/components/auth/login-form";
import { safeInternalPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? safeInternalPath(params.next, "") : undefined;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 font-semibold">Bem-vindo de volta</h1>
        <p className="mt-2 text-muted-foreground">Entre para acessar seu ambiente no Genvity.</p>
      </div>
      {params.erro === "link-invalido" ? (
        <Alert tone="warning" title="Link inválido ou expirado">
          Solicite um novo link de confirmação ou de redefinição de senha.
        </Alert>
      ) : null}
      {params.saiu ? <Alert tone="success">Você saiu da sua conta com segurança.</Alert> : null}
      <LoginForm next={next || undefined} />
      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
