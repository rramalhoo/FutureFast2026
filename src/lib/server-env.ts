import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  SIGNATURE_PROVIDER: z.enum(["none", "dev-unsigned"]).default("none"),
  SIGNATURE_DEV_SECRET: z.string().min(32).optional(),
  ANTHROPIC_API_KEY: z.string().min(10).optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
});

function emptyToUndefined(value: string | undefined) {
  return value && value.trim() !== "" ? value : undefined;
}

export const serverEnv = serverSchema.parse({
  APP_ENV: emptyToUndefined(process.env.APP_ENV),
  SUPABASE_SERVICE_ROLE_KEY: emptyToUndefined(process.env.SUPABASE_SERVICE_ROLE_KEY),
  SIGNATURE_PROVIDER: emptyToUndefined(process.env.SIGNATURE_PROVIDER),
  SIGNATURE_DEV_SECRET: emptyToUndefined(process.env.SIGNATURE_DEV_SECRET),
  ANTHROPIC_API_KEY: emptyToUndefined(process.env.ANTHROPIC_API_KEY),
  ANTHROPIC_MODEL: emptyToUndefined(process.env.ANTHROPIC_MODEL),
});

if (serverEnv.APP_ENV === "production" && serverEnv.SIGNATURE_PROVIDER === "dev-unsigned") {
  // Falha explícita: o selo de desenvolvimento não tem validade jurídica.
  throw new Error("SIGNATURE_PROVIDER=dev-unsigned não é permitido com APP_ENV=production.");
}
