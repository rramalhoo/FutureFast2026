import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { ResendConfirmationForm } from "@/components/auth/recovery-forms";

export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default function VerifyEmailPage() {
  return (
    <div className="space-y-8">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <MailCheck className="size-7" aria-hidden />
      </div>
      <div>
        <h1 className="text-h1 font-semibold">Confira seu e-mail</h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Se o endereço informado puder ser usado, enviamos um link de confirmação. Abra-o para ativar sua conta e
          continuar o cadastro.
        </p>
      </div>
      <ResendConfirmationForm />
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Ir para o login
        </Link>
      </p>
    </div>
  );
}
