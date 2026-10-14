import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, MapPin, ShieldCheck, Video } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { BookingForm } from "@/components/patient/booking-form";
import type { Slot } from "@/components/patient/slot-picker";
import { MODALITY } from "@/lib/labels";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Perfil do médico" };

export default async function DoctorProfile({ params }: PageProps<"/paciente/medicos/[id]">) {
  await requireRole("patient");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await getServerSupabase();
  const { data: doctor } = await supabase.from("doctors").select("*, profile:profiles!inner(full_name)").eq("id", id).eq("verification_status", "approved").maybeSingle();
  if (!doctor) notFound();
  const name = (doctor.profile as unknown as { full_name: string }).full_name;
  const { data: slots } = await supabase.rpc("get_available_slots", { p_doctor: id, p_from: todayISO(), p_days: 21 });

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/paciente/medicos"><ArrowLeft /> Médicos</Link></Button>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit p-6 lg:sticky lg:top-24">
          <Avatar name={name} size="xl" />
          <h1 className="mt-4 flex items-center gap-2 text-h2 font-semibold">{name} <BadgeCheck className="size-5 text-success" aria-label="Verificado" /></h1>
          <p className="text-muted-foreground">{doctor.specialty}</p>
          <p className="mt-1 text-sm text-subtle-foreground">CRM {doctor.crm}/{doctor.crm_state}{doctor.rqe ? ` · RQE ${doctor.rqe}` : ""}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {doctor.city ? <Badge tone="outline"><MapPin /> {doctor.city}/{doctor.state}</Badge> : null}
            {doctor.modalities.map((m) => <Badge key={m} tone="brand">{m === "telehealth" ? <Video /> : null}{MODALITY[m]}</Badge>)}
          </div>
          {doctor.bio ? <p className="mt-4 text-sm leading-relaxed whitespace-pre-line">{doctor.bio}</p> : null}
          <p className="mt-5 flex items-start gap-2 rounded-xl bg-success-soft p-3 text-caption text-success-foreground">
            <ShieldCheck className="size-4 shrink-0" /> Registro profissional conferido pela equipe Genvity.
          </p>
        </Card>
        <Card>
          <CardHeader><CardTitle>Agendar consulta</CardTitle></CardHeader>
          <CardContent>
            {!doctor.accepting_new_patients ? (
              <Alert tone="info" className="mb-4">Este profissional não está recebendo novos pacientes no momento. Pacientes já vinculados podem agendar normalmente.</Alert>
            ) : null}
            <BookingForm doctorId={id} doctorName={name} slots={(slots ?? []) as Slot[]} modalities={doctor.modalities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
