import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarPlus, ClipboardList, FileText, Lock, MessagesSquare, NotebookPen, Phone, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { AllergiesPanel } from "@/components/shared/allergies-panel";
import { DocumentsPanel } from "@/components/shared/documents-panel";
import { ScheduleForPatientDialog } from "@/components/doctor/schedule-dialog";
import { EndCareButton } from "@/components/doctor/end-care-button";
import { MEDICATION_STATUS, PRESCRIPTION_STATUS } from "@/lib/labels";
import { addDaysISO, fmt, todayISO } from "@/lib/format";
import { adherence, dosesForDay, type MedicationForSchedule } from "@/lib/doses";
import { nameOf } from "@/server/queries/patient";
import { nowMs } from "@/lib/clock";

export const metadata: Metadata = { title: "Paciente" };

export default async function PatientRecord({ params }: PageProps<"/medico/pacientes/[id]">) {
  const session = await requireRole("doctor");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await getServerSupabase();

  const { data: care } = await supabase.from("care_relationships").select("*").eq("doctor_id", session.userId).eq("patient_id", id).maybeSingle();
  if (!care || care.status === "revoked") notFound();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle();
  const active = care.status === "active";

  if (!active) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm"><Link href="/medico/pacientes"><ArrowLeft /> Pacientes</Link></Button>
        <Alert tone="warning" title={`${profile?.full_name ?? "Paciente"} — vínculo aguardando confirmação`}>
          Confirme a consulta solicitada na agenda para ativar o vínculo e acessar os dados autorizados.
        </Alert>
        <Button asChild><Link href="/medico/agenda">Ir para a agenda</Link></Button>
      </div>
    );
  }

  // Registro de acesso ao prontuário (auditoria visível ao paciente).
  await supabase.rpc("log_patient_record_access", { p_patient: id });

  const today = todayISO();
  const [patient, allergies, consults, notes, rxs, meds, logs, docs, doctor] = await Promise.all([
    supabase.from("patients").select("*").eq("id", id).maybeSingle(),
    supabase.from("allergies").select("id, substance, reaction, severity, recorded_by").eq("patient_id", id),
    supabase.from("consultations").select("*, doctor:doctors!inner(profile:profiles!inner(full_name))").eq("patient_id", id).order("occurred_at", { ascending: false }),
    supabase.from("clinical_notes").select("*").eq("patient_id", id).eq("doctor_id", session.userId).order("created_at", { ascending: false }),
    supabase.from("prescriptions").select("id, status, kind, issued_at, created_at, doctor_id, doctor:doctors!inner(profile:profiles!inner(full_name)), prescription_items(medication_name)").eq("patient_id", id).order("created_at", { ascending: false }),
    care.share_history ? supabase.from("patient_medications").select("*").eq("patient_id", id) : Promise.resolve({ data: null }),
    care.share_history ? supabase.from("dose_logs").select("patient_medication_id, scheduled_for, status").eq("patient_id", id).gte("scheduled_for", new Date(nowMs() - 7 * 86400000).toISOString()) : Promise.resolve({ data: null }),
    supabase.from("documents").select("id, title, kind, created_at, size_bytes, uploaded_by").eq("patient_id", id).order("created_at", { ascending: false }),
    supabase.from("doctors").select("messaging_enabled").eq("id", session.userId).single(),
  ]);
  const pt = patient.data;
  const age = fmt.age(pt?.birth_date);

  let adherence7: number | null = null;
  if (meds.data && logs.data) {
    let total = 0;
    let taken = 0;
    for (let i = 1; i <= 7; i++) {
      const s = adherence(dosesForDay(meds.data as MedicationForSchedule[], logs.data as never, addDaysISO(today, -i)));
      total += s.total;
      taken += s.taken;
    }
    adherence7 = total ? Math.round((taken / total) * 100) : null;
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/medico/pacientes"><ArrowLeft /> Pacientes</Link></Button>
      <Card className="p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <Avatar name={profile?.full_name} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-h1 font-semibold">{profile?.full_name}</h1>
            <p className="mt-1 text-muted-foreground">
              {age != null ? `${age} anos` : "Idade não informada"} · Nasc. {fmt.date(pt?.birth_date)}{pt?.city ? ` · ${pt.city}/${pt.state}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {pt?.phone ? <a href={`tel:${pt.phone}`} className="flex items-center gap-1.5 text-primary"><Phone className="size-4" /> {pt.phone}</a> : null}
              <Badge tone={care.share_history ? "brand" : "outline"}>{care.share_history ? "Histórico compartilhado" : "Histórico não compartilhado"}</Badge>
              <Badge tone={care.share_documents ? "info" : "outline"}>{care.share_documents ? "Documentos compartilhados" : "Documentos não compartilhados"}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary"><Link href={`/medico/consultas?nova=1&paciente=${id}`}><ClipboardList /> Registrar consulta</Link></Button>
            <Button asChild><Link href={`/medico/prescricoes/nova?paciente=${id}`}><Plus /> Prescrever</Link></Button>
            <ScheduleForPatientDialog patientId={id} patientName={profile?.full_name ?? ""} trigger={<Button variant="secondary"><CalendarPlus /> Agendar</Button>} />
            {doctor.data?.messaging_enabled ? <Button asChild variant="secondary"><Link href={`/medico/mensagens?paciente=${id}`}><MessagesSquare /> Mensagem</Link></Button> : null}
          </div>
        </div>
        {pt?.emergency_contact_name ? <p className="mt-4 text-caption text-muted-foreground">Contato de emergência: {pt.emergency_contact_name} {pt.emergency_contact_phone ? `· ${pt.emergency_contact_phone}` : ""}</p> : null}
      </Card>

      <Card>
        <CardHeader><div><CardTitle>Alergias registradas</CardTitle><CardDescription>Confira sempre antes de prescrever.</CardDescription></div></CardHeader>
        <CardContent><AllergiesPanel patientId={id} currentUserId={session.userId} allergies={allergies.data ?? []} /></CardContent>
      </Card>

      <Tabs defaultValue="consultas">
        <TabsList>
          <TabsTrigger value="consultas">Consultas</TabsTrigger>
          <TabsTrigger value="prescricoes">Prescrições</TabsTrigger>
          <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
          <TabsTrigger value="notas">Minhas observações</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>
        <TabsContent value="consultas" className="mt-6">
          <Card className="overflow-hidden">
            {consults.data?.length ? (
              <ul className="divide-y divide-border">
                {consults.data.map((c) => (
                  <li key={c.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground-strong">{fmt.dateTime(c.occurred_at)} · {nameOf(c.doctor)}{c.doctor_id === session.userId ? " (você)" : ""}</p>
                      {c.follow_up_date ? <Badge tone="info">Retorno {fmt.date(c.follow_up_date)}</Badge> : null}
                    </div>
                    {c.reason ? <p className="mt-1 text-sm text-muted-foreground">Motivo: {c.reason}</p> : null}
                    {c.summary_for_patient ? <p className="mt-2 text-sm whitespace-pre-line">{c.summary_for_patient}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={ClipboardList} title="Nenhuma consulta registrada" description={care.share_history ? undefined : "Consultas de outros médicos só aparecem se o paciente compartilhar o histórico."} />
            )}
          </Card>
        </TabsContent>
        <TabsContent value="prescricoes" className="mt-6">
          <Card className="overflow-hidden">
            {rxs.data?.length ? (
              <ul className="divide-y divide-border">
                {rxs.data.map((r) => {
                  const mine = r.doctor_id === session.userId;
                  const body = (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-foreground-strong">{(r.prescription_items as { medication_name: string }[]).map((i) => i.medication_name).join(", ") || "Sem itens"}</span>
                        <span className="text-caption text-muted-foreground">{fmt.date(r.issued_at ?? r.created_at)} · {mine ? "Você" : nameOf(r.doctor)}</span>
                      </span>
                      <Badge tone={PRESCRIPTION_STATUS[r.status].tone}>{PRESCRIPTION_STATUS[r.status].label}</Badge>
                    </>
                  );
                  return (
                    <li key={r.id}>
                      {mine ? <Link href={`/medico/prescricoes/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-muted">{body}</Link> : <div className="flex items-center gap-3 px-5 py-3.5">{body}</div>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState compact icon={FileText} title="Nenhuma prescrição" />
            )}
          </Card>
        </TabsContent>
        <TabsContent value="medicamentos" className="mt-6">
          {meds.data ? (
            <div className="space-y-4">
              {adherence7 != null ? <Alert tone="info">Registro de doses pelo paciente nos últimos 7 dias: <strong>{adherence7}%</strong> marcadas como tomadas (informação autodeclarada).</Alert> : null}
              <Card className="overflow-hidden">
                {meds.data.length ? (
                  <ul className="divide-y divide-border">
                    {meds.data.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground-strong">{m.name} {m.dosage ? <span className="font-normal text-muted-foreground">· {m.dosage}</span> : null}</span>
                          <span className="text-caption text-muted-foreground">{m.frequency ?? ""} · {m.source === "prescription" ? "Prescrito" : "Registro pessoal do paciente"}</span>
                        </span>
                        <Badge tone={MEDICATION_STATUS[m.status].tone}>{MEDICATION_STATUS[m.status].label}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState compact icon={FileText} title="Sem medicamentos registrados" />
                )}
              </Card>
            </div>
          ) : (
            <Card><EmptyState icon={Lock} title="Histórico não compartilhado" description="O paciente não autorizou o compartilhamento de medicamentos e registros de doses." /></Card>
          )}
        </TabsContent>
        <TabsContent value="notas" className="mt-6">
          <Card className="overflow-hidden">
            {notes.data?.length ? (
              <ul className="divide-y divide-border">
                {notes.data.map((n) => (
                  <li key={n.id} className="px-5 py-4">
                    <p className="flex items-center gap-2 text-caption text-muted-foreground"><NotebookPen className="size-3.5" /> {fmt.dateTime(n.created_at)} · {n.shared_with_patient ? "Compartilhada com o paciente" : "Privada"}</p>
                    <p className="mt-1.5 text-sm whitespace-pre-line">{n.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={NotebookPen} title="Nenhuma observação" description="Registre observações ao registrar uma consulta." />
            )}
          </Card>
        </TabsContent>
        <TabsContent value="documentos" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {!care.share_documents ? <Alert tone="info" className="mb-4">O paciente não compartilhou documentos. Você vê apenas os que você mesmo enviou.</Alert> : null}
              <DocumentsPanel patientId={id} currentUserId={session.userId} documents={docs.data ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end"><EndCareButton patientId={id} /></div>
    </div>
  );
}
