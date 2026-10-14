import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/recovery-forms";
import { getSession } from "@/lib/auth";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Nova senha" };

export default async function ResetPasswordPage() {
  const session = await getSession();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 font-semibold">Crie uma nova senha</h1>
        <p className="mt-2 text-muted-foreground">Escolha uma senha forte que você não use em outros serviços.</p>
      </div>
      {session ? (
        <ResetPasswordForm />
      ) : (
        <Alert tone="warning" title="Link expirado">
          Abra novamente o link recebido por e-mail ou{" "}
          <Link href="/recuperar-senha" className="font-semibold underline">
            solicite um novo
          </Link>
          .
        </Alert>
      )}
    </div>
  );
}
