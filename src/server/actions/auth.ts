"use server";

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { type ActionResult, formToObject, fromZodError } from "@/lib/action-result";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/schemas";
import { clientIp, rateLimit } from "@/lib/request";
import { safeInternalPath } from "@/lib/utils";

const TOO_MANY = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

export async function signUpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const ip = await clientIp();
  if (!(await rateLimit(`signup:${ip}`, 8, 3600))) return { ok: false, error: TOO_MANY };

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, role: parsed.data.role },
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/onboarding`,
    },
  });

  if (error) {
    if (error.code === "weak_password") return { ok: false, error: "Escolha uma senha mais forte.", fieldErrors: { password: ["Senha fraca."] } };
    if (error.status === 429) return { ok: false, error: TOO_MANY };
    // Não revelamos se o e-mail já existe (proteção contra enumeração).
    if (error.code !== "user_already_exists" && error.code !== "email_exists") {
      console.error("[genvity] signup error", error.code);
      return { ok: false, error: "Não foi possível criar a conta agora. Tente novamente." };
    }
  }

  // Resposta idêntica para e-mail novo ou já cadastrado.
  redirect("/verifique-email");
}

export async function signInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, 20, 300)) || !(await rateLimit(`login:${parsed.data.email}`, 8, 300))) {
    return { ok: false, error: TOO_MANY };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ok: false, error: "Confirme seu e-mail pelo link que enviamos antes de entrar." };
    }
    if (error.status === 429) return { ok: false, error: TOO_MANY };
    return { ok: false, error: "E-mail ou senha incorretos." };
  }

  redirect(safeInternalPath(parsed.data.next, "/entrar"));
}

export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const ip = await clientIp();
  if (!(await rateLimit(`forgot:${ip}`, 5, 900))) return { ok: false, error: TOO_MANY };

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/redefinir-senha`,
  });
  if (error && error.status !== 429) console.error("[genvity] recovery error", error.code);

  return {
    ok: true,
    message: "Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha.",
  };
}

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, error: "O link de redefinição expirou. Solicite um novo." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "A nova senha deve ser diferente da atual." };
    if (error.code === "weak_password") return { ok: false, error: "Escolha uma senha mais forte." };
    return { ok: false, error: "Não foi possível alterar a senha. Solicite um novo link." };
  }
  redirect("/entrar?senha=alterada");
}

export async function resendConfirmationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fromZodError(parsed.error);
  const ip = await clientIp();
  if (!(await rateLimit(`resend:${ip}`, 4, 900))) return { ok: false, error: TOO_MANY };

  const supabase = await getServerSupabase();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/onboarding` },
  });
  return { ok: true, message: "Se o cadastro estiver pendente, um novo link foi enviado." };
}
