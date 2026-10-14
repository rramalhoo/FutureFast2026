import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { AUDIT_ACTION_LABEL, ROLE_LABEL } from "@/lib/labels";
import { fmt } from "@/lib/format";
import { nameOf } from "@/server/queries/patient";

export const metadata: Metadata = { title: "Auditoria" };
const PAGE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  await requireRole("admin");
  const p = await searchParams;
  const action = typeof p.acao === "string" ? p.acao.replace(/[^a-z_.]/g, "").slice(0, 60) : "";
  const page = Math.max(0, Number(p.pagina) || 0);
  const supabase = await getServerSupabase();
  let query = supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, actor_role, created_at, metadata, actor:profiles!audit_logs_actor_id_fkey(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (action) query = query.ilike("action", `${action}%`);
  const { data, count } = await query;

  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" description="Registro imutável de ações sensíveis. Metadados não contêm conteúdo clínico." />
      <form className="flex gap-2" role="search">
        <label htmlFor="acao" className="sr-only">Filtrar por ação</label>
        <Input id="acao" name="acao" defaultValue={action} placeholder="Filtrar por ação (ex.: prescription., admin., care.)" />
        <Button type="submit" variant="secondary">Filtrar</Button>
      </form>
      <Card className="overflow-x-auto">
        {data?.length ? (
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border bg-surface-muted text-left text-caption text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">Quando</th><th className="px-4 py-3 font-medium">Ação</th><th className="px-4 py-3 font-medium">Autor</th><th className="px-4 py-3 font-medium">Entidade</th><th className="px-4 py-3 font-medium">Detalhes</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmt.dateTime(a.created_at)}</td>
                  <td className="px-4 py-3"><span className="font-medium text-foreground-strong">{AUDIT_ACTION_LABEL[a.action] ?? a.action}</span><span className="block font-mono text-caption text-subtle-foreground">{a.action}</span></td>
                  <td className="px-4 py-3">{a.actor ? nameOf(a.actor) : "Sistema"}{a.actor_role ? <Badge tone="outline" className="ml-2">{ROLE_LABEL[a.actor_role]}</Badge> : null}</td>
                  <td className="px-4 py-3 font-mono text-caption">{a.entity_type}{a.entity_id ? `:${a.entity_id.slice(0, 8)}` : ""}</td>
                  <td className="max-w-xs truncate px-4 py-3 font-mono text-caption text-muted-foreground" title={JSON.stringify(a.metadata)}>{JSON.stringify(a.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={ScrollText} title="Nenhum registro" />
        )}
      </Card>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{count ?? 0} registro(s)</span>
        <div className="flex gap-2">
          {page > 0 ? <Button asChild variant="secondary" size="sm"><Link href={`/admin/auditoria?acao=${action}&pagina=${page - 1}`}>Anterior</Link></Button> : null}
          {(count ?? 0) > (page + 1) * PAGE ? <Button asChild variant="secondary" size="sm"><Link href={`/admin/auditoria?acao=${action}&pagina=${page + 1}`}>Próxima</Link></Button> : null}
        </div>
      </div>
    </div>
  );
}
