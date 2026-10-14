import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { isVerified, loadLinkedPatients } from "@/server/queries/doctor";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PrescriptionEditor } from "@/components/doctor/prescription-editor";

export const metadata: Metadata = { title: "Nova prescrição" };

export default async function NewPrescription({ searchParams }: PageProps<"/medico/prescricoes/nova">) {
  const session = await requireRole("doctor");
  const p = await searchParams;
  const [verified, patients] = await Promise.all([isVerified(session.userId), loadLinkedPatients(session.userId)]);
  const supabase = await getServerSupabase();
  const { data: catalog } = await supabase.from("medications").select("id, name, presentation, is_antimicrobial, requires_special_control").order("name");
  const preselected = typeof p.paciente === "string" && patients.some((x) => x.id === p.paciente) ? p.paciente : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Nova prescrição" description="1. Paciente · 2. Medicamentos · 3. Orientações · 4. Revisão · 5. Assinatura e emissão" />
      {!verified ? (
        <Alert tone="warning">A prescrição é liberada após a verificação do CRM.</Alert>
      ) : patients.length === 0 ? (
        <Alert tone="info" title="Nenhum paciente com vínculo ativo" action={<Button asChild size="sm"><Link href="/medico/pacientes">Pacientes</Link></Button>}>
          Prescrições só podem ser emitidas para pacientes vinculados.
        </Alert>
      ) : (
        <PrescriptionEditor patients={patients} catalog={catalog ?? []} defaultPatientId={preselected} />
      )}
    </div>
  );
}
