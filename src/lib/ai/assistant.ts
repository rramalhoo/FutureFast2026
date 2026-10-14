import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/server-env";

export const ASSISTANT_MODES = {
  summarize: "Resumir texto fornecido",
  draft: "Rascunho administrativo",
  organize: "Organizar tarefas",
  help: "Ajuda com a plataforma",
} as const;
export type AssistantMode = keyof typeof ASSISTANT_MODES;

export function assistantConfigured() {
  return Boolean(serverEnv.ANTHROPIC_API_KEY);
}

const SYSTEM = `Você é o assistente de produtividade do Genvity, usado por médicos dentro da plataforma.

Seu papel é exclusivamente administrativo e organizacional:
- resumir textos que o próprio profissional colar;
- preparar rascunhos administrativos (declarações de comparecimento, comunicados, e-mails, orientações de rotina do consultório);
- organizar listas de tarefas a partir de anotações;
- explicar como usar as funcionalidades do Genvity (agenda, pacientes, consultas, prescrições com rascunho → assinatura → emissão, mensagens, perfil).

Limites obrigatórios:
- Não faça diagnósticos, não sugira condutas, tratamentos, medicamentos ou doses, e não interprete exames. Se pedirem, diga que isso é decisão do médico e ofereça ajuda apenas com a parte administrativa.
- Não invente dados de pacientes, valores, datas ou fatos. Use somente o que estiver no texto fornecido; marque lacunas com [preencher].
- Não emita nem "valide" prescrições, atestados médicos com CID ou documentos com validade legal; rascunhos sempre exigem revisão e assinatura do profissional.
- Responda em português do Brasil, de forma objetiva, em texto simples (listas com hífens são permitidas).`;

const MODE_HINT: Record<AssistantMode, string> = {
  summarize: "Tarefa: resuma o texto a seguir em tópicos curtos, preservando fatos e sem acrescentar interpretações clínicas.",
  draft: "Tarefa: prepare um rascunho administrativo conforme o pedido a seguir. Inclua campos [preencher] onde faltarem dados.",
  organize: "Tarefa: transforme as anotações a seguir em uma lista de tarefas acionáveis, uma por linha, começando com verbo.",
  help: "Tarefa: responda à dúvida sobre o uso do Genvity a seguir.",
};

let client: Anthropic | undefined;

export function streamAssistant(mode: AssistantMode, input: string) {
  client ??= new Anthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY });
  return client.beta.messages.stream({
    model: serverEnv.ANTHROPIC_MODEL,
    max_tokens: 4000,
    // Em caso de recusa por política, o próprio servidor tenta o modelo de fallback.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `${MODE_HINT[mode]}\n\n---\n${input}` }],
  });
}
