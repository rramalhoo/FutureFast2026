import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";

/** Códigos levantados intencionalmente pelas funções SQL com mensagens seguras. */
const SAFE_CODES = new Set(["22023", "42501", "P0429"]);

/**
 * Traduz erros do banco em mensagens seguras para o usuário. Mensagens de
 * erros inesperados nunca são repassadas (podem conter detalhes internos);
 * registramos apenas código e contexto, sem dados pessoais.
 */
export function safeDbError(error: Pick<PostgrestError, "code" | "message"> | null | undefined, context: string) {
  if (!error) return "Não foi possível concluir a operação.";
  if (error.message?.includes("row-level security") || error.message?.includes("permission denied")) {
    return "Você não tem permissão para esta ação.";
  }
  if (error.code && SAFE_CODES.has(error.code)) return error.message;
  if (error.code === "23505") return "Este registro já existe.";
  if (error.code === "23P01") return "Conflito de horário com outro agendamento.";
  if (error.code === "23514") return "Algum dado informado é inválido.";
  console.error(`[genvity] ${context}: db error code=${error.code ?? "unknown"}`);
  return "Não foi possível concluir a operação. Tente novamente.";
}
