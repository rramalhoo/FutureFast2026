import { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export const initialActionState = { ok: false, error: "" } as ActionResult<never>;

export function fromZodError(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "Revise os campos destacados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  };
}

/** Converte FormData em objeto simples (campos repetidos viram arrays). */
export function formToObject(formData: FormData) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue;
    const v = typeof value === "string" ? value : value;
    if (key in out) {
      const current = out[key];
      out[key] = Array.isArray(current) ? [...current, v] : [current, v];
    } else {
      out[key] = v;
    }
  }
  return out;
}
