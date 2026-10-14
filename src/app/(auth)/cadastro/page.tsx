import Link from "next/link";
import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: PageProps<"/cadastro">) {
  const params = await searchParams;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h1 font-semibold">Crie sua conta</h1>
        <p className="mt-2 text-muted-foreground">Gratuito para pacientes. Profissionais passam por verificação.</p>
      </div>
      <SignUpForm defaultRole={typeof params.perfil === "string" ? params.perfil : undefined} />
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
