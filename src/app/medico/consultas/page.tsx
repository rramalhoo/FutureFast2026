import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { isVerified, loadLinkedPatients } from "@/server/queries/doctor";
import { nameOf } from "@/server/queries/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ConsultationForm } from "@/components/doctor/consultation-form";
import { fmt } from "@/lib/format";
import { nowMs } from "@/lib/clock";

export const metadata: Metadata = { title: "Consultas" };

export default async function ConsultationsPage({ searchParams }: PageProps<"/medico/consultas">) {
  const session = await requireRole("doctor");
  const p = await searchParams;
  const supabase = await getServerSupabase();
  const [verified, patients, consults, appts] = await Promise.all([
    isVerified(session.userId),
    loadLinkedPatients(session.userId),
    supabase.from("consultations").select("id, patient_id, occurred_at, reason, follow_up_date, patient:patients!inner(profile:profiles!inner(full_name))").eq("doctor_id", session.userId).order("occurred_at", { ascending: false }).limit(50),
    supabase.from("appointments").select("id, patient_id, starts_at").eq("doctor_id", session.userId).eq("status", "confirmed").lte("starts_at", new Date(nowMs() + 3600 * 1000).toISOString()).order("starts_at", { ascending: false }).limit(30),
  ]);
  const showForm = p.nova === "1";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultas"
        description="Registros de atendimento: resumo para o paciente, observações clínicas e retornos."
        actions={!showForm && verified ? <Button asChild><Link href="/medico/consultas?nova=1"><Plus /> Registrar consulta</Link></Button> : null}
      />
      {!verified ? <Alert tone="warning">O registro de consultas é liberado após a verificação do CRM.</Alert> : null}
      {showForm && verified ? (
        <Card>
          <CardHeader><CardTitle>Registrar consulta</CardTitle></CardHeader>
          <CardContent>
            {patients.length ? (
              <ConsultationForm
                patients={patients}
                appointments={(appts.data ?? []).map((a) => ({ id: a.id, patientId: a.patient_id, startsAt: a.starts_at }))}
                defaultPatient={typeof p.paciente === "string" ? p.paciente : undefined}
              />
            ) : (
              <EmptyState compact icon={ClipboardList} title="Nenhum paciente com vínculo ativo" />
            )}
          </CardContent>
        </Card>
      ) : null}
      <Card className="overflow-hidden">
        {consults.data?.length ? (
          <ul className="divide-y divide-border">
            {consults.data.map((c) => (
              <li key={c.id}>
                <Link href={`/medico/pacientes/${c.patient_id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground-strong">{nameOf(c.patient)}</span>
                    <span className="block text-caption text-muted-foreground">{fmt.dateTime(c.occurred_at)}{c.reason ? ` · ${c.reason}` : ""}</span>
                  </span>
                  {c.follow_up_date ? <Badge tone="info">Retorno {fmt.date(c.follow_up_date)}</Badge> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ClipboardList} title="Nenhuma consulta registrada" description="Registre o atendimento ao final de cada consulta." />
        )}
      </Card>
    </div>
  );
}
