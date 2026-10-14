import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Search, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InviteForm } from "@/components/doctor/invite-form";
import { fmt } from "@/lib/format";
import { profileNames } from "@/server/queries/patient";

export const metadata: Metadata = { title: "Pacientes" };

export default async function DoctorPatients({ searchParams }: PageProps<"/medico/pacientes">) {
  const session = await requireRole("doctor");
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q.trim().toLowerCase().slice(0, 80) : "";
  const supabase = await getServerSupabase();
  const [{ data: doctor }, { data: care }, { data: invites }] = await Promise.all([
    supabase.from("doctors").select("verification_status").eq("id", session.userId).single(),
    supabase
      .from("care_relationships")
      .select("patient_id, status, share_history, share_documents, activated_at, created_at, patient:patients(birth_date, city, state)")
      .eq("doctor_id", session.userId)
      .neq("status", "revoked")
      .order("created_at", { ascending: false }),
    supabase.from("care_invitations").select("id, email, status, created_at, expires_at").eq("doctor_id", session.userId).order("created_at", { ascending: false }).limit(10),
  ]);
  const names = await profileNames((care ?? []).map((c) => c.patient_id));
  const approved = doctor?.verification_status === "approved";
  const rows = (care ?? []).filter((c) => !q || (names.get(c.patient_id) ?? "").toLowerCase().includes(q));

  return (
    <div className="space-y-6">
      <PageHeader title="Pacientes" description="Pacientes vinculados a você. O acesso respeita as autorizações dadas por cada um." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <form className="flex gap-2" role="search">
            <label htmlFor="pq" className="sr-only">Buscar paciente</label>
            <Input id="pq" name="q" defaultValue={q} placeholder="Buscar por nome" />
            <Button type="submit" variant="secondary"><Search /> Buscar</Button>
          </form>
          <Card className="overflow-hidden">
            {rows.length === 0 ? (
              <EmptyState icon={Users} title={q ? "Nenhum paciente encontrado" : "Nenhum paciente vinculado"} description="Pacientes aparecem aqui quando agendam com você ou aceitam um convite." />
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((c) => {
                  const pt = (c.patient as unknown as { birth_date: string | null; city: string | null; state: string | null } | null) ?? { birth_date: null, city: null, state: null };
                  const age = fmt.age(pt.birth_date);
                  return (
                    <li key={c.patient_id}>
                      <Link href={`/medico/pacientes/${c.patient_id}`} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-muted">
                        <Avatar name={names.get(c.patient_id) ?? "Paciente"} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground-strong">{names.get(c.patient_id) ?? "Paciente"}</span>
                          <span className="block truncate text-caption text-muted-foreground">
                            {age != null ? `${age} anos` : "Idade não informada"}{pt.city ? ` · ${pt.city}/${pt.state}` : ""}
                          </span>
                        </span>
                        <span className="hidden gap-1.5 sm:flex">
                          {c.status === "pending" ? <Badge tone="warning">Aguardando confirmação</Badge> : null}
                          {c.share_history ? <Badge tone="brand">Histórico</Badge> : null}
                          {c.share_documents ? <Badge tone="info">Documentos</Badge> : null}
                        </span>
                        <ChevronRight className="size-4 text-subtle-foreground" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Convidar paciente</CardTitle></CardHeader>
            <CardContent><InviteForm disabled={!approved} /></CardContent>
          </Card>
          {invites?.length ? (
            <Card>
              <CardHeader><CardTitle>Convites enviados</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {invites.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{i.email}</span>
                      <Badge tone={i.status === "accepted" ? "success" : i.status === "pending" ? (new Date(i.expires_at) < new Date() ? "neutral" : "warning") : "neutral"}>
                        {i.status === "accepted" ? "Aceito" : i.status === "declined" ? "Recusado" : new Date(i.expires_at) < new Date() ? "Expirado" : "Pendente"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
