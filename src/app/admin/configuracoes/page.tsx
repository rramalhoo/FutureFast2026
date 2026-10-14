import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSignatureProvider } from "@/lib/signature";
import { assistantConfigured } from "@/lib/ai/assistant";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingEditor } from "@/components/admin/admin-controls";

export const metadata: Metadata = { title: "Configurações da plataforma" };

export default async function PlatformSettings() {
  await requireRole("admin");
  const supabase = await getServerSupabase();
  const { data: settings } = await supabase.from("platform_settings").select("*").order("key");
  const signature = getSignatureProvider();
  const integrations = [
    { name: "Assinatura digital de prescrições", status: signature.isAvailable() ? (signature.legallyValid ? "Ativa" : "Somente desenvolvimento") : "Não configurada", tone: signature.legallyValid ? "success" : signature.isAvailable() ? "warning" : "danger", detail: signature.label },
    { name: "Assistente de IA (médicos)", status: assistantConfigured() ? "Configurado" : "Não configurado", tone: assistantConfigured() ? "success" : "neutral", detail: "ANTHROPIC_API_KEY" },
    { name: "Gateway de pagamentos", status: "Não integrado", tone: "neutral", detail: "Assinaturas registradas manualmente" },
    { name: "Notificações push / e-mail transacional", status: "Não configurado", tone: "neutral", detail: "Notificações in-app ativas" },
    { name: "Integração de estoque (ERP de farmácias)", status: "Não integrado", tone: "neutral", detail: "Cadastro manual ativo" },
  ] as const;
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Parâmetros da plataforma e estado das integrações externas." />
      <Card>
        <CardHeader><div><CardTitle>Integrações</CardTitle><CardDescription>Status real lido da configuração do servidor.</CardDescription></div></CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span><span className="font-medium text-foreground-strong">{i.name}</span><span className="block text-caption text-muted-foreground">{i.detail}</span></span>
                <Badge tone={i.tone}>{i.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><div><CardTitle>Parâmetros</CardTitle><CardDescription>Alterações ficam registradas na auditoria.</CardDescription></div></CardHeader>
        <CardContent className="space-y-3">{(settings ?? []).map((s) => <SettingEditor key={s.key} setting={s} />)}</CardContent>
      </Card>
    </div>
  );
}
