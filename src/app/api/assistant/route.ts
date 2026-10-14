import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/request";
import { ASSISTANT_MODES, assistantConfigured, streamAssistant, type AssistantMode } from "@/lib/ai/assistant";

const bodySchema = z.object({
  mode: z.enum(Object.keys(ASSISTANT_MODES) as [AssistantMode, ...AssistantMode[]]),
  input: z.string().trim().min(3).max(12000),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.profile.role !== "doctor") return NextResponse.json({ error: "Acesso restrito a médicos." }, { status: 403 });
  if (!assistantConfigured()) return NextResponse.json({ error: "O assistente de IA não está configurado neste ambiente." }, { status: 503 });

  const supabase = await getServerSupabase();
  const { data: enabled } = await supabase.from("platform_settings").select("value").eq("key", "assistant.enabled").maybeSingle();
  if (enabled?.value === false) return NextResponse.json({ error: "O assistente foi desativado pela administração." }, { status: 503 });
  const { data: doctor } = await supabase.from("doctors").select("verification_status").eq("id", session.userId).single();
  if (doctor?.verification_status !== "approved") return NextResponse.json({ error: "Disponível após a verificação do CRM." }, { status: 403 });

  if (!(await rateLimit(`assistant:${session.userId}`, 20, 600))) {
    return NextResponse.json({ error: "Limite de uso atingido. Tente novamente em alguns minutos." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const upstream = streamAssistant(parsed.data.mode, parsed.data.input);
        for await (const event of upstream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await upstream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n[O assistente não pode ajudar com este pedido. Ele se limita a tarefas administrativas.]"));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n[Resposta interrompida por tamanho. Divida o pedido em partes menores.]"));
        }
      } catch (error) {
        console.error("[genvity] assistant error", error instanceof Error ? error.name : "unknown");
        controller.enqueue(encoder.encode("\n\n[Não foi possível concluir a resposta agora. Tente novamente.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
