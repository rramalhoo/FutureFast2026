import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CreditCard, Eye, KeyRound, Settings2, ShieldCheck, UserRound } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DsrForm,
  ExportButton,
  PasswordForm,
  PatientDetailsForm,
  PreferencesPanel,
  ProfileForm,
  SignOutOthersButton,
} from "@/components/account/forms";
import { ConsentManager, type ConsentRow } from "@/components/account/consent-manager";
import { PlanChooser } from "@/components/account/plan-chooser";
import { AUDIT_ACTION_LABEL, DSR_KIND, DSR_STATUS, ROLE_LABEL, SUBSCRIPTION_STATUS, VERIFICATION } from "@/lib/labels";
import { fmt } from "@/lib/format";

export const metadata: Metadata = { title: "Minha conta" };

const TABS = ["perfil", "seguranca", "preferencias", "privacidade", "plano"] as const;

export default async function AccountPage({ searchParams }: PageProps<"/conta">) {
  const session = await requireSession("/conta");
  const params = await searchParams;
  const tab = TABS.includes(params.tab as (typeof TABS)[number]) ? (params.tab as string) : "perfil";
  const supabase = await getServerSupabase();
  const role = session.profile.role;

  const [patientRes, verificationRes, accessLogRes, dsrRes, subRes, plansRes, careRes] = await Promise.all([
    role === "patient" ? supabase.from("patients").select("*").eq("id", session.userId).maybeSingle() : Promise.resolve({ data: null }),
    role === "doctor" || role === "pharmacy"
      ? supabase.from("verification_requests").select("*").eq("submitted_by", session.userId).order("created_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("audit_logs").select("id, action, actor_role, created_at").eq("subject_user_id", session.userId).order("created_at", { ascending: false }).limit(25),
    supabase.from("data_subject_requests").select("*").eq("user_id", session.userId).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("*, plans(name)").eq("profile_id", session.userId).in("status", ["pending", "trialing", "active", "past_due"]).maybeSingle(),
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
    role === "patient"
      ? supabase
          .from("care_relationships")
          .select("doctor_id, status, share_history, share_documents, doctor:doctors!inner(specialty, profile:profiles!inner(full_name))")
          .eq("patient_id", session.userId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const audience = role === "patient" ? ["patient"] : role === "doctor" ? ["doctor", "clinic"] : role === "pharmacy" ? ["pharmacy"] : [];
  const plans = (plansRes.data ?? []).filter((p) => audience.includes(p.audience));
  const subscription = subRes.data;
  const consentRows: ConsentRow[] = (careRes.data ?? []).map((c) => {
    const doctor = c.doctor as unknown as { specialty: string; profile: { full_name: string } };
    return {
      doctorId: c.doctor_id,
      doctorName: doctor.profile.full_name,
      specialty: doctor.specialty,
      status: c.status,
      shareHistory: c.share_history,
      shareDocuments: c.share_documents,
    };
  });
  const verification = verificationRes.data;
  const prefs = (session.profile.preferences ?? {}) as Parameters<typeof PreferencesPanel>[0]["initialPrefs"];

  return (
    <div className="space-y-8">
      <PageHeader title="Minha conta" description={`${ROLE_LABEL[role]} · ${session.email}`} />
      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="perfil"><UserRound /> Perfil</TabsTrigger>
          <TabsTrigger value="seguranca"><KeyRound /> Segurança</TabsTrigger>
          <TabsTrigger value="preferencias"><Settings2 /> Preferências</TabsTrigger>
          <TabsTrigger value="privacidade"><ShieldCheck /> Privacidade</TabsTrigger>
          {role !== "admin" ? <TabsTrigger value="plano"><CreditCard /> Plano</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="perfil" className="mt-6 space-y-6">
          {verification ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2"><BadgeCheck className="size-5 text-primary" /> Verificação {role === "doctor" ? "profissional" : "cadastral"}</CardTitle>
                  <CardDescription>Enviada em {fmt.dateTime(verification.created_at)}</CardDescription>
                </div>
                <Badge tone={VERIFICATION[verification.status].tone}>{VERIFICATION[verification.status].label}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {verification.status === "under_review" ? (
                  <p className="text-sm text-muted-foreground">A equipe Genvity está analisando seus documentos. Você será notificado do resultado.</p>
                ) : null}
                {verification.status === "rejected" ? (
                  <Alert tone="danger" title="Motivo informado" action={<Button asChild size="sm"><Link href="/onboarding">Reenviar</Link></Button>}>
                    {verification.reviewer_notes ?? "—"}
                  </Alert>
                ) : null}
                {role === "doctor" ? (
                  <Button asChild variant="secondary" size="sm"><Link href="/medico/perfil">Editar perfil profissional</Link></Button>
                ) : (
                  <Button asChild variant="secondary" size="sm"><Link href="/farmacia/configuracoes">Dados da farmácia</Link></Button>
                )}
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader><CardTitle>Dados da conta</CardTitle></CardHeader>
            <CardContent><ProfileForm fullName={session.profile.full_name} email={session.email} /></CardContent>
          </Card>
          {patientRes.data ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Dados pessoais</CardTitle>
                  <CardDescription>Visíveis apenas para você e para médicos vinculados.</CardDescription>
                </div>
              </CardHeader>
              <CardContent><PatientDetailsForm patient={patientRes.data} /></CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="seguranca" className="mt-6 space-y-6">
          <Card>
            <CardHeader><div><CardTitle>Alterar senha</CardTitle><CardDescription>Use ao menos 8 caracteres com letras e números.</CardDescription></div></CardHeader>
            <CardContent><PasswordForm /></CardContent>
          </Card>
          <Card>
            <CardHeader><div><CardTitle>Sessões</CardTitle><CardDescription>Encerre o acesso em outros dispositivos onde sua conta esteja aberta.</CardDescription></div></CardHeader>
            <CardContent><SignOutOthersButton /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferencias" className="mt-6">
          <Card><CardContent className="pt-6"><PreferencesPanel initialPrefs={prefs} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="privacidade" className="mt-6 space-y-6">
          {role === "patient" ? (
            <Card>
              <CardHeader><div><CardTitle>Autorizações de compartilhamento</CardTitle><CardDescription>Escolha o que cada médico pode acessar. Dados básicos e alergias ficam visíveis enquanto o vínculo estiver ativo.</CardDescription></div></CardHeader>
              <CardContent>
                {consentRows.length ? <ConsentManager rows={consentRows} /> : <EmptyState compact icon={ShieldCheck} title="Nenhum vínculo" description="Quando você agendar com um médico ou aceitar um convite, ele aparecerá aqui." />}
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader><div><CardTitle>Seus dados</CardTitle><CardDescription>Baixe uma cópia completa dos dados vinculados à sua conta (LGPD, art. 18).</CardDescription></div></CardHeader>
            <CardContent><ExportButton /></CardContent>
          </Card>
          <Card>
            <CardHeader><div><CardTitle className="flex items-center gap-2"><Eye className="size-5 text-primary" /> Registro de acessos</CardTitle><CardDescription>Eventos recentes envolvendo seus dados.</CardDescription></div></CardHeader>
            <CardContent>
              {accessLogRes.data?.length ? (
                <ul className="divide-y divide-border">
                  {accessLogRes.data.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <span className="font-medium text-foreground-strong">{AUDIT_ACTION_LABEL[a.action] ?? a.action}</span>
                      <span className="text-right text-muted-foreground">
                        {a.actor_role ? `${ROLE_LABEL[a.actor_role]} · ` : ""}{fmt.dateTime(a.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum acesso registrado ainda.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><div><CardTitle>Solicitações sobre seus dados</CardTitle><CardDescription>Correção, exclusão ou relatório completo. Respondemos pela central de notificações.</CardDescription></div></CardHeader>
            <CardContent className="space-y-6">
              {dsrRes.data?.length ? (
                <ul className="divide-y divide-border rounded-2xl border border-border">
                  {dsrRes.data.map((d) => (
                    <li key={d.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        <span className="font-medium text-foreground-strong">{DSR_KIND[d.kind]}</span>
                        <span className="block text-caption text-muted-foreground">{fmt.dateTime(d.created_at)}{d.resolution_notes ? ` · ${d.resolution_notes}` : ""}</span>
                      </span>
                      <Badge tone={DSR_STATUS[d.status].tone}>{DSR_STATUS[d.status].label}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
              <DsrForm />
            </CardContent>
          </Card>
        </TabsContent>

        {role !== "admin" ? (
          <TabsContent value="plano" className="mt-6 space-y-6">
            <Alert tone="info" title="Pagamentos ainda não integrados">
              Nenhuma cobrança é realizada. Planos pagos ficam como “Aguardando pagamento” até a integração com o
              meio de pagamento ser ativada.
            </Alert>
            {subscription ? (
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Assinatura atual</p>
                    <p className="text-h3 font-semibold">{(subscription.plans as unknown as { name: string } | null)?.name}</p>
                  </div>
                  <Badge tone={SUBSCRIPTION_STATUS[subscription.status].tone}>{SUBSCRIPTION_STATUS[subscription.status].label}</Badge>
                </CardContent>
              </Card>
            ) : null}
            <PlanChooser plans={plans} currentPlanId={subscription?.plan_id} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
