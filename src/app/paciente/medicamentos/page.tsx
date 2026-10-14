import type { Metadata } from "next";
import Link from "next/link";
import { Pill, ScanLine } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { loadMedicationsWithLogs } from "@/server/queries/patient";
import { dosesForDay, type MedicationForSchedule } from "@/lib/doses";
import { addDaysISO, fmt, todayISO } from "@/lib/format";
import { PageHeader, SectionTitle } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoseList } from "@/components/patient/dose-list";
import { MedicationCard } from "@/components/patient/medication-card";
import { AddMedicationDialog } from "@/components/patient/add-medication-dialog";

export const metadata: Metadata = { title: "Meus medicamentos" };

export default async function MedicationsPage() {
  await requireRole("patient");
  const today = todayISO();
  const { meds, logs } = await loadMedicationsWithLogs(addDaysISO(today, -30), today);
  const doses = dosesForDay(meds as MedicationForSchedule[], logs, today);
  const current = meds.filter((m) => m.status === "active" || m.status === "paused");
  const past = meds.filter((m) => m.status === "completed" || m.status === "discontinued");

  const groups = current.reduce<Record<string, typeof current>>((acc, m) => {
    const key = m.treatment_label ?? (m.source === "prescription" ? "Prescritos" : "Registros pessoais");
    (acc[key] ??= []).push(m);
    return acc;
  }, {});
  const logsFor = (id: string) =>
    logs.filter((l) => l.patient_medication_id === id).sort((a, b) => b.scheduled_for.localeCompare(a.scheduled_for));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meus medicamentos"
        description="Acompanhe seus tratamentos e registre as doses. Registrar uma dose não altera a prescrição."
        actions={
          <>
            <Button asChild variant="secondary"><Link href="/paciente/leitor"><ScanLine /> Ler receita em papel</Link></Button>
            <AddMedicationDialog />
          </>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <SectionTitle title={`Hoje · ${fmt.dateLong(today)}`} />
          {doses.length ? <DoseList doses={doses} /> : <p className="py-4 text-sm text-muted-foreground">Nenhuma dose programada para hoje.</p>}
        </CardContent>
      </Card>

      <Tabs defaultValue="atuais">
        <TabsList>
          <TabsTrigger value="atuais">Em acompanhamento ({current.length})</TabsTrigger>
          <TabsTrigger value="anteriores">Anteriores ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="atuais" className="mt-6 space-y-8">
          {current.length === 0 ? (
            <Card>
              <EmptyState
                icon={Pill}
                title="Nenhum medicamento em acompanhamento"
                description="Quando seu médico emitir uma receita, os medicamentos aparecem aqui com os horários sugeridos. Você também pode criar um registro pessoal."
                action={<AddMedicationDialog />}
              />
            </Card>
          ) : (
            Object.entries(groups).map(([label, items]) => (
              <section key={label}>
                <SectionTitle title={label} />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((m) => (
                    <MedicationCard key={m.id} med={m} logs={logsFor(m.id)} />
                  ))}
                </div>
              </section>
            ))
          )}
        </TabsContent>
        <TabsContent value="anteriores" className="mt-6">
          {past.length === 0 ? (
            <Card><EmptyState compact icon={Pill} title="Sem tratamentos anteriores" /></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {past.map((m) => (
                <MedicationCard key={m.id} med={m} logs={logsFor(m.id)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
