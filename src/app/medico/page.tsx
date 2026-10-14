import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ClipboardList, FileText, MessagesSquare, Plus, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { SimpleBarChart } from "@/components/charts/bar-chart";
import { AppointmentButtons } from "@/components/doctor/appointment-buttons";
import { MODALITY, PRESCRIPTION_STATUS } from "@/lib/labels";
import { addDaysISO, fmt, localDateISO, todayISO, zonedDateTime } from "@/lib/format";
import { nameOf } from "@/server/queries/patient";
import { firstName } from "@/lib/utils";

export const metadata: Metadata = { title: "Visão geral" };

export default async function DoctorHome({ searchParams }: PageProps<"/medico">) {
  const session = await requireRole("doctor");
  const params = await searchParams;
  const supabase = await getServerSupabase();
  const today = todayISO();
  const weekEnd = addDaysISO(today, 7);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [doctor, upcoming, requests, patients, unread, rxs, consultsMonth, rxMonth] = await Promise.all([
    supabase.from("doctors").select("verification_status").eq("id", session.userId).single(),
    supabase
      .from("appointments")
      .select("id, starts_at, modality, status, reason, patient:patients!inner(profile:profiles!inner(full_name))")
      .eq("doctor_id", session.userId)
      .eq("status", "confirmed")
      .gte("starts_at", zonedDateTime(today, "00:00").toISOString())
      .lt("starts_at", zonedDateTime(weekEnd, "00:00").toISOString())
      .order("starts_at"),
    supabase
      .from("appointments")
      .select("id, starts_at, modality, status, reason, patient:patients!inner(profile:profiles!inner(full_name))")
      .eq("doctor_id", session.userId)
      .eq("status", "requested")
      .order("starts_at")
      .limit(6),
    supabase.from("care_relationships").select("patient_id", { count: "exact", head: true }).eq("doctor_id", session.userId).eq("status", "active"),
    supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).neq("sender_id", session.userId),
    supabase
      .from("prescriptions")
      .select("id, status, created_at, patient:patients!inner(profile:profiles!inner(full_name)), prescription_items(medication_name)")
      .eq("doctor_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("consultations").select("id", { count: "exact", head: true }).eq("doctor_id", session.userId).gte("occurred_at", zonedDateTime(monthStart, "00:00").toISOString()),
    supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("doctor_id", session.userId).gte("issued_at", zonedDateTime(monthStart, "00:00").toISOString()),
  ]);

  const todayAppts = (upcoming.data ?? []).filter((a) => localDateISO(a.starts_at) === today);
  const weekData = Array.from({ length: 7 }).map((_, i) => {
    const d = addDaysISO(today, i);
    return { label: i === 0 ? "Hoje" : fmt.dateShort(d), value: (upcoming.data ?? []).filter((a) => localDateISO(a.starts_at) === d).length };
  });
  const approved = doctor.data?.verification_status === "approved";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={fmt.weekday(new Date())}
        title={`Olá, Dr(a). ${firstName(session.profile.full_name)}`}
        description="Seu dia em um relance."
        actions={
          approved ? (
            <>
              <Button asChild variant="secondary"><Link href="/medico/consultas?nova=1"><ClipboardList /> Registrar consulta</Link></Button>
              <Button asChild><Link href="/medico/prescricoes/nova"><Plus /> Nova prescrição</Link></Button>
            </>
          ) : null
        }
      />
      {params.verificacao === "enviada" ? <Alert tone="success" title="Documentos enviados">Avisaremos assim que a verificação do CRM for concluída.</Alert> : null}
      {!approved ? (
        <Alert tone="warning" title="Verificação profissional pendente">
          Enquanto o CRM não é verificado, seu perfil não aparece na busca e não é possível acessar pacientes ou prescrever. Você já pode configurar sua agenda e seu perfil.
        </Alert>
      ) : null}

      <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StaggerItem><StatCard icon={CalendarDays} label="Consultas hoje" value={todayAppts.length} hint={`${requests.data?.length ?? 0} solicitação(ões) pendente(s)`} href="/medico/agenda" /></StaggerItem>
        <StaggerItem><StatCard icon={Users} label="Pacientes vinculados" value={patients.count ?? 0} tone="info" href="/medico/pacientes" /></StaggerItem>
        <StaggerItem><StatCard icon={MessagesSquare} label="Mensagens não lidas" value={unread.count ?? 0} tone="warning" href="/medico/mensagens" /></StaggerItem>
        <StaggerItem><StatCard icon={FileText} label="Prescrições emitidas no mês" value={rxMonth.count ?? 0} hint={`${consultsMonth.count ?? 0} consulta(s) registrada(s)`} tone="success" href="/medico/prescricoes" /></StaggerItem>
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Atendimentos de hoje</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link href="/medico/agenda">Agenda</Link></Button>
            </CardHeader>
            <CardContent>
              {todayAppts.length ? (
                <ul className="space-y-2">
                  {todayAppts.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                      <span className="w-14 text-center font-semibold text-foreground-strong tabular">{fmt.time(a.starts_at)}</span>
                      <Avatar name={nameOf(a.patient)} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground-strong">{nameOf(a.patient)}</span>
                        <span className="block truncate text-caption text-muted-foreground">{MODALITY[a.modality]}{a.reason ? ` · ${a.reason}` : ""}</span>
                      </span>
                      <AppointmentButtons id={a.id} status={a.status} startsAt={a.starts_at} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={CalendarDays} title="Nenhum atendimento hoje" description="Consultas confirmadas para hoje aparecem aqui." />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Solicitações de consulta</CardTitle></CardHeader>
            <CardContent>
              {requests.data?.length ? (
                <ul className="space-y-2">
                  {requests.data.map((a) => (
                    <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-border p-3 sm:flex-row sm:items-center">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-foreground-strong">{nameOf(a.patient)}</span>
                        <span className="block text-caption text-muted-foreground">{fmt.weekday(a.starts_at)} às {fmt.time(a.starts_at)} · {MODALITY[a.modality]}</span>
                        {a.reason ? <span className="block text-caption text-muted-foreground">“{a.reason}”</span> : null}
                      </span>
                      <AppointmentButtons id={a.id} status={a.status} startsAt={a.starts_at} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Consultas confirmadas · próximos 7 dias</CardTitle></CardHeader>
            <CardContent><SimpleBarChart data={weekData} valueLabel="Consultas" height={200} /></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Prescrições recentes</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link href="/medico/prescricoes">Todas</Link></Button>
            </CardHeader>
            <CardContent>
              {rxs.data?.length ? (
                <ul className="divide-y divide-border">
                  {rxs.data.map((r) => (
                    <li key={r.id}>
                      <Link href={`/medico/prescricoes/${r.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground-strong">{nameOf(r.patient)}</span>
                          <span className="block truncate text-caption text-muted-foreground">{(r.prescription_items as { medication_name: string }[]).map((i) => i.medication_name).join(", ") || "Sem itens"}</span>
                        </span>
                        <Badge tone={PRESCRIPTION_STATUS[r.status].tone}>{PRESCRIPTION_STATUS[r.status].label}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={FileText} title="Nenhuma prescrição ainda" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
