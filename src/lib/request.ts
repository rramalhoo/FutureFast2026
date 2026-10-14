import "server-only";
import { headers } from "next/headers";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/server-env";

/** IP do cliente (atrás de proxy confiável). Usado apenas como chave de rate limit. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Rate limit server-side em janela fixa, persistido no Postgres (funciona com
 * múltiplas instâncias/serverless). Retorna true se a requisição pode seguir.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number) {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) return true;
  const admin = getAdminSupabase();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[genvity] rate limit indisponível", error.code);
    return true;
  }
  return data === true;
}
