import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DoctorProfileForm } from "@/components/doctor/profile-form";
import { VERIFICATION } from "@/lib/labels";

export const metadata: Metadata = { title: "Perfil profissional" };

export default async function DoctorProfilePage() {
  const session = await requireRole("doctor");
  const supabase = await getServerSupabase();
  const { data: doctor } = await supabase.from("doctors").select("*").eq("id", session.userId).single();
  if (!doctor) return null;
  return (
    <div className="space-y-6">
      <PageHeader title="Perfil profissional" description="Como você aparece para os pacientes." />
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2"><BadgeCheck className="size-5 text-primary" /> CRM {doctor.crm}/{doctor.crm_state}</CardTitle>
            <CardDescription>Para alterar CRM ou UF, abra um chamado — uma nova verificação será necessária.</CardDescription>
          </div>
          <Badge tone={VERIFICATION[doctor.verification_status].tone}>{VERIFICATION[doctor.verification_status].label}</Badge>
        </CardHeader>
        <CardContent><DoctorProfileForm doctor={doctor} /></CardContent>
      </Card>
    </div>
  );
}
