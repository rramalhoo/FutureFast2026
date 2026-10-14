import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellRing, CalendarDays, FileText, Mail, Pill, Stethoscope, TriangleAlert } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadTodayDoses } from "@/server/queries/patient";
import { adherence, nextDose } from "@/lib/doses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { DoseList, NextDoseCard } from "@/components/patient/dose-list";
import { APPOINTMENT_STATUS, MODALITY, PRESCRIPTION_STATUS } from "@/lib/labels";
import { addDaysISO, fmt, todayISO } from "@/lib/format";
import { firstName } from "@/lib/utils";

export const metadata: Metadata = { title: "Início" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

export default async function PatientHome({ searchParams }: PageProps<"/paciente">) {
  const session = await requireRole("patient");
  const params = await searchParams;
  const supabase = await getServerSupabase();
  const nowIso = new Date().toISOString();
  const soon = addDaysISO(todayISO(), 7);

  const [{ meds, doses }, appts, rxs, invites] = await Promise.all([
    loadTodayDoses(),
    supabase
      .from("appointments")
      .select("id, starts_at, modality, status, doctor:doctors!inner(specialty, profile:profiles!inner(full_name))")
      .in("status", ["requested", "confirmed"])
      .gte("ends_at", nowIso)
      .order("starts_at")
      .limit(3),
    supabase
      .from("prescriptions")
      .select("id, status, kind, issued_at, valid_until, doctor:doctors!inner(profile:profiles!inner(full_name)), prescription_items(medication_name)")
      .order("issued_at", { ascending: false, nullsFirst: false })
      .limit(3),
    supabase.from("care_invitations").select("id").eq("status", "pending"),
  ]);

  const next = nextDose(doses);
  const stats = adherence(doses);
  const activeMeds = meds.filter((m) => m.status === "active");
  const endingSoon = activeMeds.filter((m) => m.end_date && m.end_date <= soon && m.end_date >= todayISO());
  const expiringRx = (rxs.data ?? []).filter((r) => r.status === "issued" && r.valid_until && r.valid_until <= soon);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">{fmt.weekday(new Date())}</p>
        <h1 className="text-h1 font-semibold">
          {greeting()}, {firstName(session.profile.full_name)}
        </h1>
      </header>

      {params["bem-vindo"] ? <Alert tone="success" title="Cadastro concluído">Seu Genvity está pronto. Agende com um médico ou aguarde o convite do seu médico.</Alert> : null}
      {params.senha === "alterada" ? <Alert tone="success">Sua senha foi alterada.</Alert> : null}

      <Stagger className="grid gap-4 lg:grid-cols-3">
        <StaggerItem className="lg:col-span-2">
          <NextDoseCard dose={next} />
        </StaggerItem>
        <StaggerItem>
          <Card className="flex h-full items-center gap-5 p-6">
            <ProgressRing value={stats.percent} label="Doses de hoje registradas">
              <span className="text-h2 font-semibold text-foreground-strong tabular">{stats.taken}</span>
              <span className="text-caption text-muted-foreground">de {stats.total}</span>
            </ProgressRing>
            <div>
              <p className="font-semibold text-foreground-strong">Doses de hoje</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.total === 0 ? "Nenhuma dose programada." : stats.taken === stats.total ? "Tudo registrado por hoje." : "Continue acompanhando ao longo do dia."}
              </p>
              <Link href="/paciente/medicamentos" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                {activeMeds.length} em acompanhamento <ArrowRight className="size-4" />
              </Link>
            </div>
          </Card>
        </StaggerItem>
      </Stagger>

      {(invites.data?.length || endingSoon.length || expiringRx.length) ? (
        <section className="grid gap-3 md:grid-cols-2" aria-label="Avisos importantes">
          {invites.data?.length ? (
            <Alert tone="brand" icon={Mail} title={`${invites.data.length} convite(s) de acompanhamento`} action={<Button asChild size="sm" variant="secondary"><Link href="/paciente/medicos?tab=convites">Ver</Link></Button>}>
              Um médico convidou você para acompanhamento.
            </Alert>
          ) : null}
          {expiringRx.map((r) => (
            <Alert key={r.id} tone="warning" icon={TriangleAlert} title="Receita perto do vencimento" action={<Button asChild size="sm" variant="secondary"><Link href={`/paciente/receitas/${r.id}`}>Abrir</Link></Button>}>
              Válida até {fmt.date(r.valid_until)}.
            </Alert>
          ))}
          {endingSoon.map((m) => (
            <Alert key={m.id} tone="info" icon={BellRing} title={`${m.name}: tratamento termina em breve`}>
              Previsto até {fmt.date(m.end_date)}. Em caso de dúvida, fale com seu médico.
            </Alert>
          ))}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Pill className="size-5 text-primary" /> Horários de hoje</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/paciente/medicamentos">Ver todos</Link></Button>
          </CardHeader>
          <CardContent>
            {doses.length ? (
              <DoseList doses={doses} compact />
            ) : (
              <EmptyState compact icon={Pill} title="Sem doses hoje" description="Receitas emitidas pelo seu médico aparecem aqui automaticamente." action={<Button asChild size="sm" variant="secondary"><Link href="/paciente/medicamentos">Adicionar medicamento</Link></Button>} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /> Próximas consultas</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link href="/paciente/calendario">Calendário</Link></Button>
            </CardHeader>
            <CardContent>
              {appts.data?.length ? (
                <ul className="space-y-2">
                  {appts.data.map((a) => {
                    const d = a.doctor as unknown as { specialty: string; profile: { full_name: string } };
                    return (
                      <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                        <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                          <span className="text-caption leading-none font-medium uppercase">{fmt.dateShort(a.starts_at).split(" ")[1]}</span>
                          <span className="text-lg leading-none font-semibold">{fmt.dateShort(a.starts_at).split(" ")[0]}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground-strong">{d.profile.full_name}</span>
                          <span className="block text-caption text-muted-foreground">{fmt.time(a.starts_at)} · {MODALITY[a.modality]} · {d.specialty}</span>
                        </span>
                        <Badge tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].label}</Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState compact icon={Stethoscope} title="Nenhuma consulta marcada" action={<Button asChild size="sm" variant="secondary"><Link href="/paciente/medicos">Buscar médicos</Link></Button>} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="size-5 text-primary" /> Receitas recentes</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link href="/paciente/receitas">Todas</Link></Button>
            </CardHeader>
            <CardContent>
              {rxs.data?.length ? (
                <ul className="divide-y divide-border">
                  {rxs.data.map((r) => {
                    const items = (r.prescription_items ?? []) as { medication_name: string }[];
                    return (
                      <li key={r.id}>
                        <Link href={`/paciente/receitas/${r.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-foreground-strong">{items.map((i) => i.medication_name).join(", ") || "Receita"}</span>
                            <span className="block text-caption text-muted-foreground">{fmt.date(r.issued_at)}</span>
                          </span>
                          <Badge tone={PRESCRIPTION_STATUS[r.status].tone}>{PRESCRIPTION_STATUS[r.status].label}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState compact icon={FileText} title="Nenhuma receita ainda" description="Receitas digitais emitidas para você aparecem aqui." />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <p className="text-center text-caption text-muted-foreground">
        O Genvity não substitui orientação médica e não é serviço de emergência. Em urgências, ligue 192.
      </p>
    </div>
  );
}
