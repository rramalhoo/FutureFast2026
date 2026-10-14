import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarDays, Mail, MapPin, MessagesSquare, Search, Stethoscope, Video } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NativeSelect } from "@/components/ui/input";
import { FavoriteButton } from "@/components/patient/favorite-button";
import { InvitationCard } from "@/components/patient/invitation-card";
import { AppointmentActions } from "@/components/patient/appointment-actions";
import { APPOINTMENT_STATUS, MODALITY, SPECIALTIES } from "@/lib/labels";
import { fmt } from "@/lib/format";
import { nameOf } from "@/server/queries/patient";
import { cn } from "@/lib/utils";
import { nowMs } from "@/lib/clock";

export const metadata: Metadata = { title: "Médicos" };

const TABS = [
  { v: "buscar", l: "Buscar" },
  { v: "meus", l: "Meus médicos" },
  { v: "consultas", l: "Minhas consultas" },
  { v: "convites", l: "Convites" },
];

export default async function DoctorsPage({ searchParams }: PageProps<"/paciente/medicos">) {
  const session = await requireRole("patient");
  const p = await searchParams;
  const tab = TABS.some((t) => t.v === p.tab) ? (p.tab as string) : "buscar";
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string).slice(0, 80) : "");
  const supabase = await getServerSupabase();
  const { count: inviteCount } = await supabase.from("care_invitations").select("id", { count: "exact", head: true }).eq("status", "pending");

  return (
    <div className="space-y-6">
      <PageHeader title="Médicos" description="Encontre profissionais verificados e acompanhe suas consultas." />
      <nav className="scrollbar-thin flex gap-1 overflow-x-auto rounded-2xl border border-border bg-surface-muted p-1 sm:w-fit" aria-label="Seções">
        {TABS.map((t) => (
          <Link key={t.v} href={`/paciente/medicos?tab=${t.v}`} aria-current={tab === t.v ? "page" : undefined} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors", tab === t.v ? "bg-surface text-foreground-strong shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {t.l}
            {t.v === "convites" && inviteCount ? <span className="rounded-full bg-primary px-1.5 text-[0.7rem] text-primary-foreground">{inviteCount}</span> : null}
          </Link>
        ))}
      </nav>
      {tab === "buscar" ? <SearchTab q={str("q")} specialty={str("especialidade")} city={str("cidade")} modality={str("modalidade")} available={p.disponivel === "1"} userId={session.userId} /> : null}
      {tab === "meus" ? <MyDoctorsTab /> : null}
      {tab === "consultas" ? <AppointmentsTab /> : null}
      {tab === "convites" ? <InvitesTab /> : null}
    </div>
  );
}

async function SearchTab({ q, specialty, city, modality, available, userId }: { q: string; specialty: string; city: string; modality: string; available: boolean; userId: string }) {
  const supabase = await getServerSupabase();
  const [{ data: doctors }, { data: favs }] = await Promise.all([
    supabase.rpc("search_doctors", {
      p_query: q || undefined,
      p_specialty: specialty || undefined,
      p_city: city || undefined,
      p_modality: modality === "in_person" || modality === "telehealth" ? modality : undefined,
      p_only_available: available,
    }),
    supabase.from("favorites").select("target_id").eq("user_id", userId).eq("target_type", "doctor"),
  ]);
  const favSet = new Set((favs ?? []).map((f) => f.target_id));
  const list = [...(doctors ?? [])].sort((a, b) => Number(favSet.has(b.id)) - Number(favSet.has(a.id)));

  return (
    <div className="space-y-5">
      <form className="surface-card grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-end" role="search">
        <input type="hidden" name="tab" value="buscar" />
        <label className="space-y-1.5 text-sm font-medium">
          Nome ou especialidade
          <Input name="q" defaultValue={q} placeholder="Ex.: cardiologia" />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Especialidade
          <NativeSelect name="especialidade" defaultValue={specialty}>
            <option value="">Todas</option>
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </NativeSelect>
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Cidade
          <Input name="cidade" defaultValue={city} />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          Modalidade
          <NativeSelect name="modalidade" defaultValue={modality}>
            <option value="">Todas</option>
            <option value="in_person">Presencial</option>
            <option value="telehealth">Teleconsulta</option>
          </NativeSelect>
        </label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm whitespace-nowrap"><input type="checkbox" name="disponivel" value="1" defaultChecked={available} className="size-4 accent-[var(--primary)]" /> Com horários</label>
          <Button type="submit"><Search /> Buscar</Button>
        </div>
      </form>
      <p className="text-caption text-muted-foreground">Resultados ordenados por disponibilidade e nome. O Genvity não vende destaque na busca.</p>
      {list.length === 0 ? (
        <Card><EmptyState icon={Stethoscope} title="Nenhum médico encontrado" description="Tente remover filtros ou buscar por outra especialidade." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((d) => (
            <article key={d.id} className="surface-card group flex flex-col p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start gap-3">
                <Avatar name={d.full_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold text-foreground-strong">
                    <span className="truncate">{d.full_name}</span>
                    <BadgeCheck className="size-4 shrink-0 text-success" aria-label="CRM verificado" />
                  </p>
                  <p className="text-sm text-muted-foreground">{d.specialty}</p>
                  <p className="text-caption text-subtle-foreground">CRM {d.crm}/{d.crm_state}{d.rqe ? ` · RQE ${d.rqe}` : ""}</p>
                </div>
                <FavoriteButton type="doctor" id={d.id} initial={favSet.has(d.id)} label={d.full_name} />
              </div>
              {d.bio ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{d.bio}</p> : null}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {d.city ? <Badge tone="outline"><MapPin /> {d.city}/{d.state}</Badge> : null}
                {d.modalities.map((m) => <Badge key={m} tone="brand">{m === "telehealth" ? <Video /> : null}{MODALITY[m]}</Badge>)}
              </div>
              <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                <span className="text-caption text-muted-foreground">
                  {d.next_slot ? <>Próximo horário<br /><span className="font-medium text-foreground-strong">{fmt.dateShort(d.next_slot)} · {fmt.time(d.next_slot)}</span></> : "Sem horários nas próximas semanas"}
                </span>
                <Button asChild size="sm"><Link href={`/paciente/medicos/${d.id}`}>Ver perfil</Link></Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

async function MyDoctorsTab() {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("care_relationships")
    .select("doctor_id, status, share_history, share_documents, doctor:doctors!inner(specialty, crm, crm_state, messaging_enabled, profile:profiles!inner(full_name))")
    .neq("status", "revoked");
  if (!data?.length) {
    return <Card><EmptyState icon={Stethoscope} title="Você ainda não tem médicos vinculados" description="Agende uma consulta ou aceite o convite do seu médico." action={<Button asChild><Link href="/paciente/medicos?tab=buscar">Buscar médicos</Link></Button>} /></Card>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((c) => {
        const d = c.doctor as unknown as { specialty: string; crm: string; crm_state: string; messaging_enabled: boolean; profile: { full_name: string } };
        return (
          <div key={c.doctor_id} className="surface-card p-5">
            <div className="flex items-center gap-3">
              <Avatar name={d.profile.full_name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground-strong">{d.profile.full_name}</p>
                <p className="text-sm text-muted-foreground">{d.specialty} · CRM {d.crm}/{d.crm_state}</p>
              </div>
              <Badge tone={c.status === "active" ? "success" : "warning"}>{c.status === "active" ? "Vínculo ativo" : "Aguardando confirmação"}</Badge>
            </div>
            <p className="mt-3 text-caption text-muted-foreground">
              Compartilhando: dados básicos{c.share_history ? ", histórico" : ""}{c.share_documents ? ", documentos" : ""}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm"><Link href={`/paciente/medicos/${c.doctor_id}`}><CalendarDays /> Agendar</Link></Button>
              {c.status === "active" && d.messaging_enabled ? <Button asChild size="sm" variant="secondary"><Link href={`/paciente/mensagens?medico=${c.doctor_id}`}><MessagesSquare /> Mensagem</Link></Button> : null}
              <Button asChild size="sm" variant="ghost"><Link href="/conta?tab=privacidade">Autorizações</Link></Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function AppointmentsTab() {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("appointments")
    .select("id, doctor_id, starts_at, modality, status, reason, cancellation_reason, doctor:doctors!inner(specialty, profile:profiles!inner(full_name))")
    .order("starts_at", { ascending: false })
    .limit(50);
  const now = nowMs();
  const upcoming = (data ?? []).filter((a) => new Date(a.starts_at).getTime() >= now && ["requested", "confirmed"].includes(a.status)).reverse();
  const past = (data ?? []).filter((a) => !upcoming.includes(a));
  const Row = ({ a, actions }: { a: NonNullable<typeof data>[number]; actions?: boolean }) => (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground-strong">{nameOf(a.doctor)}</p>
        <p className="text-caption text-muted-foreground">{fmt.weekday(a.starts_at)} às {fmt.time(a.starts_at)} · {MODALITY[a.modality]}</p>
        {a.cancellation_reason && a.status === "cancelled" ? <p className="text-caption text-muted-foreground">Motivo: {a.cancellation_reason}</p> : null}
      </div>
      <Badge tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].label}</Badge>
      {actions ? <AppointmentActions id={a.id} doctorId={a.doctor_id} modality={a.modality} /> : null}
    </li>
  );
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-h3 font-semibold">Próximas</h2>
        <Card className="overflow-hidden">
          {upcoming.length ? <ul className="divide-y divide-border">{upcoming.map((a) => <Row key={a.id} a={a} actions />)}</ul> : <EmptyState compact icon={CalendarDays} title="Nenhuma consulta futura" />}
        </Card>
      </section>
      {past.length ? (
        <section>
          <h2 className="mb-3 text-h3 font-semibold">Anteriores e canceladas</h2>
          <Card className="overflow-hidden"><ul className="divide-y divide-border">{past.map((a) => <Row key={a.id} a={a} />)}</ul></Card>
        </section>
      ) : null}
    </div>
  );
}

async function InvitesTab() {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("care_invitations")
    .select("id, doctor:doctors!inner(specialty, crm, crm_state, profile:profiles!inner(full_name))")
    .eq("status", "pending");
  if (!data?.length) return <Card><EmptyState icon={Mail} title="Nenhum convite pendente" description="Quando um médico convidar você pelo seu e-mail, o convite aparecerá aqui." /></Card>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.map((i) => {
        const d = i.doctor as unknown as { specialty: string; crm: string; crm_state: string; profile: { full_name: string } };
        return <InvitationCard key={i.id} id={i.id} doctorName={d.profile.full_name} specialty={d.specialty} crm={`CRM ${d.crm}/${d.crm_state}`} />;
      })}
    </div>
  );
}
