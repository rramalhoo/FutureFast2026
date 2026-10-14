import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadLinkedPatients } from "@/server/queries/doctor";
import { loadPrescription } from "@/server/queries/prescriptions";
import { PageHeader } from "@/components/ui/page-header";
import { PrescriptionEditor } from "@/components/doctor/prescription-editor";

export const metadata: Metadata = { title: "Editar rascunho" };

export default async function EditPrescription({ params }: PageProps<"/medico/prescricoes/[id]/editar">) {
  const session = await requireRole("doctor");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const rx = await loadPrescription(id);
  if (!rx || rx.doctor_id !== session.userId) notFound();
  if (rx.status !== "draft") redirect(`/medico/prescricoes/${id}`);
  const supabase = await getServerSupabase();
  const [patients, { data: catalog }] = await Promise.all([
    loadLinkedPatients(session.userId),
    supabase.from("medications").select("id, name, presentation, is_antimicrobial, requires_special_control").order("name"),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Editar rascunho" description="Somente rascunhos podem ser alterados." />
      <PrescriptionEditor
        patients={patients}
        catalog={catalog ?? []}
        initial={{
          id,
          patientId: rx.patient_id,
          kind: rx.kind,
          validUntil: rx.valid_until ?? "",
          generalInstructions: rx.general_instructions ?? "",
          items: rx.prescription_items.map((i) => ({
            medicationId: i.medication_id ?? undefined,
            medicationName: i.medication_name,
            presentation: i.presentation ?? "",
            dosage: i.dosage,
            route: i.route ?? "",
            frequency: i.frequency,
            timesPerDay: i.times_per_day ? String(i.times_per_day) : "",
            scheduleTimes: i.schedule_times.map((t) => t.slice(0, 5)),
            durationDays: i.duration_days ? String(i.duration_days) : "",
            continuousUse: i.continuous_use,
            quantity: i.quantity ?? "",
            instructions: i.instructions ?? "",
          })),
        }}
      />
    </div>
  );
}
