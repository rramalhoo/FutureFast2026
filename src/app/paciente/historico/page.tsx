import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, NotebookPen, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AllergiesPanel } from "@/components/shared/allergies-panel";
import { DocumentsPanel } from "@/components/shared/documents-panel";
import { MEDICATION_STATUS, PRESCRIPTION_STATUS } from "@/lib/labels";
import { fmt } from "@/lib/format";
import { nameOf } from "@/server/queries/patient";

export const metadata: Metadata = { title: "Histórico de saúde" };

export default async function HistoryPage() {
  const session = await requireRole("patient");
  const supabase = await getServerSupabase();
  const [consults, notes, rxs, meds, allergies, docs] = await Promise.all([
    supabase.from("consultations").select("*, doctor:doctors!inner(specialty, profile:profiles!inner(full_name))").order("occurred_at", { ascending: false }),
    supabase.from("clinical_notes").select("id, content, created_at, consultation_id, doctor:doctors!inner(profile:profiles!inner(full_name))").order("created_at", { ascending: false }),
    supabase.from("prescriptions").select("id, status, issued_at, prescription_items(medication_name)").order("issued_at", { ascending: false }),
    supabase.from("patient_medications").select("id, name, dosage, status, start_date, end_date, source").order("start_date", { ascending: false }),
    supabase.from("allergies").select("id, substance, reaction, severity, recorded_by").eq("patient_id", session.userId),
    supabase.from("documents").select("id, title, kind, created_at, size_bytes, uploaded_by, uploader:profiles!documents_uploaded_by_fkey(full_name)").eq("patient_id", session.userId).order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de saúde"
        description="Tudo o que foi registrado no seu cuidado, em um só lugar."
        actions={<Button asChild variant="secondary"><Link href="/conta?tab=privacidade"><ShieldCheck /> Quem pode ver</Link></Button>}
      />
      <Card>
        <CardHeader><div><CardTitle>Alergias</CardTitle><CardDescription>Visíveis para médicos vinculados. Mantenha sempre atualizado.</CardDescription></div></CardHeader>
        <CardContent><AllergiesPanel patientId={session.userId} currentUserId={session.userId} allergies={allergies.data ?? []} /></CardContent>
      </Card>
      <Tabs defaultValue="consultas">
        <TabsList>
          <TabsTrigger value="consultas">Consultas</TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>
        <TabsContent value="consultas" className="mt-6">
          {consults.data?.length ? (
            <ol className="relative space-y-4 border-l-2 border-border pl-6">
              {consults.data.map((c) => {
                const cNotes = (notes.data ?? []).filter((n) => n.consultation_id === c.id);
                return (
                  <li key={c.id} className="relative">
                    <span className="absolute top-5 -left-[1.95rem] size-3.5 rounded-full border-2 border-surface bg-primary" aria-hidden />
                    <Card className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground-strong">{nameOf(c.doctor)}</p>
                          <p className="text-caption text-muted-foreground">{(c.doctor as unknown as { specialty: string }).specialty} · {fmt.dateTime(c.occurred_at)}</p>
                        </div>
                        {c.follow_up_date ? <Badge tone="info">Retorno: {fmt.date(c.follow_up_date)}</Badge> : null}
                      </div>
                      {c.reason ? <p className="mt-3 text-sm"><span className="text-muted-foreground">Motivo:</span> {c.reason}</p> : null}
                      {c.summary_for_patient ? <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{c.summary_for_patient}</p> : null}
                      {cNotes.map((n) => (
                        <div key={n.id} className="mt-3 rounded-xl bg-primary-soft/50 p-3 text-sm">
                          <p className="mb-1 flex items-center gap-1.5 text-caption font-medium text-primary-soft-foreground"><NotebookPen className="size-3.5" /> Observação compartilhada pelo médico</p>
                          <p className="whitespace-pre-line">{n.content}</p>
                        </div>
                      ))}
                    </Card>
                  </li>
                );
              })}
            </ol>
          ) : (
            <Card><EmptyState icon={ClipboardList} title="Nenhuma consulta registrada" description="Os resumos das consultas registradas pelos seus médicos aparecem aqui." /></Card>
          )}
        </TabsContent>
        <TabsContent value="receitas" className="mt-6">
          <Card className="overflow-hidden">
            {rxs.data?.length ? (
              <ul className="divide-y divide-border">
                {rxs.data.map((r) => (
                  <li key={r.id}>
                    <Link href={`/paciente/receitas/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-muted">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground-strong">{(r.prescription_items as { medication_name: string }[]).map((i) => i.medication_name).join(", ")}</span>
                        <span className="text-caption text-muted-foreground">{fmt.date(r.issued_at)}</span>
                      </span>
                      <Badge tone={PRESCRIPTION_STATUS[r.status].tone}>{PRESCRIPTION_STATUS[r.status].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={ClipboardList} title="Nenhuma receita" />
            )}
          </Card>
        </TabsContent>
        <TabsContent value="medicamentos" className="mt-6">
          <Card className="overflow-hidden">
            {meds.data?.length ? (
              <ul className="divide-y divide-border">
                {meds.data.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground-strong">{m.name} {m.dosage ? <span className="font-normal text-muted-foreground">· {m.dosage}</span> : null}</span>
                      <span className="text-caption text-muted-foreground">
                        {fmt.date(m.start_date)} {m.end_date ? `– ${fmt.date(m.end_date)}` : ""} · {m.source === "prescription" ? "Prescrito" : "Registro pessoal"}
                      </span>
                    </span>
                    <Badge tone={MEDICATION_STATUS[m.status].tone}>{MEDICATION_STATUS[m.status].label}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={ClipboardList} title="Nenhum medicamento" />
            )}
          </Card>
        </TabsContent>
        <TabsContent value="documentos" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <DocumentsPanel
                patientId={session.userId}
                currentUserId={session.userId}
                documents={(docs.data ?? []).map((d) => ({ ...d, uploader_name: d.uploaded_by === session.userId ? undefined : nameOf(d.uploader) }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
