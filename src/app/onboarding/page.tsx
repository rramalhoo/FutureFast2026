import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSession, ROLE_HOME } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PatientOnboardingForm } from "@/components/onboarding/patient-form";
import { DoctorOnboardingForm } from "@/components/onboarding/doctor-form";
import { PharmacyOnboardingForm } from "@/components/onboarding/pharmacy-form";
import { Alert } from "@/components/ui/alert";
import { FadeIn } from "@/components/ui/motion";

export const metadata: Metadata = { title: "Primeiros passos" };

const copy = {
  patient: {
    title: "Vamos personalizar seu Genvity",
    description: "Esses dados ajudam médicos vinculados e farmácias a confirmar sua identidade com segurança.",
  },
  doctor: {
    title: "Verificação profissional",
    description: "Para proteger pacientes, recursos clínicos só são liberados após conferência do CRM pela equipe Genvity.",
  },
  pharmacy: {
    title: "Cadastro do estabelecimento",
    description: "Farmácias passam por verificação cadastral e de autorização sanitária antes de consultar receitas.",
  },
} as const;

export default async function OnboardingPage() {
  const session = await requireSession("/onboarding");
  const { profile } = session;
  if (profile.role === "admin") redirect("/admin");

  const supabase = await getServerSupabase();
  let rejectedNote: string | null = null;
  if (profile.onboarding_completed) {
    // Médicos/farmácias recusados podem reenviar; os demais seguem para o painel.
    const { data: lastRequest } = await supabase
      .from("verification_requests")
      .select("status, reviewer_notes")
      .eq("submitted_by", session.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (profile.role === "patient" || lastRequest?.status !== "rejected") redirect(ROLE_HOME[profile.role]);
    rejectedNote = lastRequest?.reviewer_notes ?? "";
  }

  const role = profile.role as "patient" | "doctor" | "pharmacy";
  return (
    <FadeIn className="space-y-8">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-primary">Etapa final do cadastro</p>
        <h1 className="text-h1 font-semibold text-balance">{copy[role].title}</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">{copy[role].description}</p>
      </div>
      {!session.emailConfirmed ? (
        <Alert tone="warning">Confirme seu e-mail para concluir o cadastro.</Alert>
      ) : null}
      {rejectedNote !== null ? (
        <Alert tone="danger" title="Sua verificação anterior não foi aprovada">
          {rejectedNote || "Revise os dados e reenvie a documentação."}
        </Alert>
      ) : null}
      <div className="surface-card p-5 sm:p-8">
        {role === "patient" ? <PatientOnboardingForm defaultName={profile.full_name} /> : null}
        {role === "doctor" ? <DoctorOnboardingForm defaultName={profile.full_name} userId={session.userId} /> : null}
        {role === "pharmacy" ? <PharmacyOnboardingForm defaultName={profile.full_name} userId={session.userId} /> : null}
      </div>
    </FadeIn>
  );
}
