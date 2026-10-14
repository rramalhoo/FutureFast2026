import type { Metadata } from "next";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadAuthUsers } from "@/server/queries/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SuspendButton } from "@/components/admin/admin-controls";
import { ROLE_LABEL } from "@/lib/labels";
import { fmt } from "@/lib/format";
import type { UserRole } from "@/lib/supabase/types";
import { nowMs } from "@/lib/clock";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  const session = await requireRole("admin");
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q.trim().slice(0, 80) : "";
  const role = typeof p.papel === "string" && ["patient", "doctor", "pharmacy", "admin"].includes(p.papel) ? (p.papel as UserRole) : null;
  const supabase = await getServerSupabase();
  let query = supabase.from("profiles").select("id, full_name, role, onboarding_completed, created_at").order("created_at", { ascending: false }).limit(200);
  if (role) query = query.eq("role", role);
  if (q) query = query.ilike("full_name", `%${q.replace(/[%_,()]/g, " ")}%`);
  const [{ data: profiles }, auth] = await Promise.all([query, loadAuthUsers()]);
  const now = nowMs();

  return (
    <div className="space-y-6">
      <PageHeader title="Usuários" description="Contas da plataforma. Dados de saúde não são exibidos nesta área." />
      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="uq" className="sr-only">Buscar</label>
        <Input id="uq" name="q" defaultValue={q} placeholder="Buscar por nome" />
        <NativeSelect name="papel" defaultValue={role ?? ""} aria-label="Tipo de conta" className="sm:w-48">
          <option value="">Todos os tipos</option>
          {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </NativeSelect>
        <Button type="submit" variant="secondary"><Search /> Filtrar</Button>
      </form>
      <Card className="overflow-x-auto">
        {profiles?.length ? (
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border bg-surface-muted text-left text-caption text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">Usuário</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Situação</th><th className="px-4 py-3 font-medium">Último acesso</th><th className="px-4 py-3 font-medium">Criado</th><th className="px-4 py-3"><span className="sr-only">Ações</span></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles.map((u) => {
                const a = auth.get(u.id);
                const banned = !!a?.bannedUntil && new Date(a.bannedUntil).getTime() > now;
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={u.full_name} size="sm" /><span><span className="block font-medium text-foreground-strong">{u.full_name || "Sem nome"}</span><span className="text-caption text-muted-foreground">{a?.email}</span></span></div></td>
                    <td className="px-4 py-3"><Badge tone="outline">{ROLE_LABEL[u.role]}</Badge></td>
                    <td className="px-4 py-3">
                      {banned ? <Badge tone="danger">Suspenso</Badge> : !a?.confirmed ? <Badge tone="warning">E-mail não confirmado</Badge> : !u.onboarding_completed && u.role !== "admin" ? <Badge tone="info">Cadastro incompleto</Badge> : <Badge tone="success">Ativo</Badge>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{a?.lastSignIn ? fmt.relative(a.lastSignIn) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmt.date(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">{u.id !== session.userId ? <SuspendButton userId={u.id} suspended={banned} name={u.full_name} /> : <span className="text-caption text-muted-foreground">Você</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={Users} title="Nenhum usuário encontrado" />
        )}
      </Card>
      <p className="text-caption text-muted-foreground">Exibindo até 200 registros. Para verificações profissionais, use <Link className="text-primary" href="/admin/verificacoes">Verificações</Link>.</p>
    </div>
  );
}
