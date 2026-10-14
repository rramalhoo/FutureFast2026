import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import type { Tables, UserRole } from "@/lib/supabase/types";

export type SessionContext = {
  userId: string;
  email: string;
  emailConfirmed: boolean;
  profile: Tables<"profiles">;
};

export const ROLE_HOME: Record<UserRole, string> = {
  patient: "/paciente",
  doctor: "/medico",
  pharmacy: "/farmacia",
  admin: "/admin",
};

/**
 * Camada de acesso à sessão. `getUser()` valida o token no servidor de Auth,
 * então o resultado é confiável (diferente de ler o cookie diretamente).
 * Memorizado por requisição com React `cache`.
 */
export const getSession = cache(async (): Promise<SessionContext | null> => {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (!profile) return null;

  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    emailConfirmed: Boolean(data.user.email_confirmed_at),
    profile,
  };
});

export async function requireSession(next?: string) {
  const session = await getSession();
  if (!session) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return session;
}

/** Exige papel específico e onboarding concluído. */
export async function requireRole(role: UserRole | UserRole[], options: { allowIncompleteOnboarding?: boolean } = {}) {
  const session = await requireSession();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(session.profile.role)) {
    redirect(ROLE_HOME[session.profile.role]);
  }
  if (!options.allowIncompleteOnboarding && session.profile.role !== "admin" && !session.profile.onboarding_completed) {
    redirect("/onboarding");
  }
  return session;
}
