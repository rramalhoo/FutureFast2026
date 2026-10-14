import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadMyPharmacy } from "@/server/queries/pharmacy";
import { nameOf } from "@/server/queries/patient";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { PharmacySettingsForm } from "@/components/pharmacy/settings-form";
import { VERIFICATION } from "@/lib/labels";
import { fmt } from "@/lib/format";

export const metadata: Metadata = { title: "Configurações da farmácia" };
const ROLE: Record<string, string> = { owner: "Responsável", pharmacist: "Farmacêutico(a)", attendant: "Atendente" };

export default async function PharmacySettings() {
  const session = await requireRole("pharmacy");
  const pharmacy = await loadMyPharmacy(session.userId);
  if (!pharmacy) return <Alert tone="warning">Farmácia não encontrada. Conclua o cadastro.</Alert>;
  const supabase = await getServerSupabase();
  const { data: members } = await supabase.from("pharmacy_members").select("profile_id, member_role, created_at, profile:profiles!inner(full_name)").eq("pharmacy_id", pharmacy.id);
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Dados exibidos aos pacientes e equipe da farmácia." />
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2"><BadgeCheck className="size-5 text-primary" /> {pharmacy.legal_name}</CardTitle>
            <CardDescription>CNPJ {fmt.cnpj(pharmacy.cnpj)} · AFE {pharmacy.afe_number} · RT {pharmacy.technical_responsible} ({pharmacy.technical_responsible_crf})</CardDescription>
          </div>
          <Badge tone={VERIFICATION[pharmacy.verification_status].tone}>{VERIFICATION[pharmacy.verification_status].label}</Badge>
        </CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Razão social, CNPJ, AFE e responsável técnico só podem ser alterados com nova verificação (abra um chamado na Central de ajuda).</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Dados públicos</CardTitle></CardHeader>
        <CardContent><PharmacySettingsForm pharmacy={pharmacy} canEdit={pharmacy.member_role === "owner"} /></CardContent>
      </Card>
      <Card>
        <CardHeader><div><CardTitle>Equipe</CardTitle><CardDescription>Convite de novos membros da equipe estará disponível no plano Genvity Farmácias.</CardDescription></div></CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            {(members ?? []).map((m) => (
              <li key={m.profile_id} className="flex justify-between py-2.5"><span>{nameOf(m.profile)}</span><Badge tone="outline">{ROLE[m.member_role]}</Badge></li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
