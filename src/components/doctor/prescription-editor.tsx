"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { GripVertical, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { patientAllergiesAction, saveDraftAction } from "@/server/actions/doctor";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { TimesEditor } from "@/components/shared/times-editor";
import { addDaysISO, todayISO } from "@/lib/format";
import { PRESCRIPTION_KIND } from "@/lib/labels";

type Catalog = { id: string; name: string; presentation: string; is_antimicrobial: boolean; requires_special_control: boolean };
type Item = {
  key: string;
  medicationId?: string;
  medicationName: string;
  presentation: string;
  dosage: string;
  route: string;
  frequency: string;
  timesPerDay: string;
  scheduleTimes: string[];
  durationDays: string;
  continuousUse: boolean;
  quantity: string;
  instructions: string;
};
export type DraftInitial = {
  id?: string;
  patientId?: string;
  kind: "simple" | "antimicrobial" | "special_control";
  validUntil: string;
  generalInstructions: string;
  items: Omit<Item, "key">[];
};

const DEFAULT_VALIDITY = { simple: 30, antimicrobial: 10, special_control: 30 } as const;
const emptyItem = (key: string = crypto.randomUUID()): Item => ({ key, medicationName: "", presentation: "", dosage: "", route: "Oral", frequency: "", timesPerDay: "", scheduleTimes: [], durationDays: "", continuousUse: false, quantity: "", instructions: "" });

export function PrescriptionEditor({ patients, catalog, initial, defaultPatientId }: { patients: { id: string; name: string }[]; catalog: Catalog[]; initial?: DraftInitial; defaultPatientId?: string }) {
  const router = useRouter();
  const [patientId, setPatientId] = React.useState(initial?.patientId ?? defaultPatientId ?? "");
  const [kind, setKind] = React.useState<DraftInitial["kind"]>(initial?.kind ?? "simple");
  const [validUntil, setValidUntil] = React.useState(initial?.validUntil || addDaysISO(todayISO(), DEFAULT_VALIDITY.simple));
  const [general, setGeneral] = React.useState(initial?.generalInstructions ?? "");
  const [items, setItems] = React.useState<Item[]>(
    // Chaves determinísticas no estado inicial: iguais no servidor e no cliente (ids de label/campo).
    initial?.items.length ? initial.items.map((i, idx) => ({ ...i, key: `item-${idx}` })) : [emptyItem("item-0")],
  );
  const [allergies, setAllergies] = React.useState<{ substance: string; reaction: string | null; severity: string }[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!patientId) return;
    let active = true;
    void patientAllergiesAction(patientId).then((a) => active && setAllergies(a));
    return () => {
      active = false;
    };
  }, [patientId]);

  const update = (key: string, patch: Partial<Item>) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const allergyHits = items.filter((i) => i.medicationName && allergies.some((a) => i.medicationName.toLowerCase().includes(a.substance.toLowerCase()) || a.substance.toLowerCase().includes(i.medicationName.toLowerCase().split(" ")[0] ?? "")));
  const needsAntimicrobial = items.some((i) => catalog.find((c) => c.id === i.medicationId)?.is_antimicrobial) && kind !== "antimicrobial";
  const needsSpecial = items.some((i) => catalog.find((c) => c.id === i.medicationId)?.requires_special_control) && kind !== "special_control";

  async function save() {
    setSaving(true);
    setErrors(null);
    const r = await saveDraftAction({
      id: initial?.id,
      patientId,
      kind,
      validUntil,
      generalInstructions: general || undefined,
      items: items.map((i) => ({
        medicationId: i.medicationId || undefined,
        medicationName: i.medicationName,
        presentation: i.presentation || undefined,
        dosage: i.dosage,
        route: i.route || undefined,
        frequency: i.frequency,
        timesPerDay: i.timesPerDay ? Number(i.timesPerDay) : undefined,
        scheduleTimes: i.scheduleTimes.filter(Boolean),
        durationDays: i.durationDays && !i.continuousUse ? Number(i.durationDays) : undefined,
        continuousUse: i.continuousUse,
        quantity: i.quantity || undefined,
        instructions: i.instructions || undefined,
      })),
    });
    setSaving(false);
    if (r.ok && r.data) {
      toast.success("Rascunho salvo.");
      router.push(`/medico/prescricoes/${r.data.id}`);
    } else if (!r.ok) {
      const firstField = r.fieldErrors ? Object.values(r.fieldErrors).flat().filter(Boolean)[0] : null;
      setErrors(firstField ?? r.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="surface-card grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Paciente" htmlFor="rx-patient" required>
          <NativeSelect value={patientId} onChange={(e) => { setAllergies([]); setPatientId(e.target.value); }} disabled={!!initial?.id}>
            <option value="" disabled>Selecione</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Tipo de receita" htmlFor="rx-kind" hint={PRESCRIPTION_KIND[kind].label}>
          <NativeSelect
            value={kind}
            onChange={(e) => {
              const k = e.target.value as DraftInitial["kind"];
              setKind(k);
              setValidUntil(addDaysISO(todayISO(), DEFAULT_VALIDITY[k]));
            }}
          >
            <option value="simple">Simples</option>
            <option value="antimicrobial">Antimicrobiano</option>
            <option value="special_control">Controle especial</option>
          </NativeSelect>
        </Field>
        <Field label="Válida até" htmlFor="rx-valid" required hint="Limites por tipo são aplicados na emissão.">
          <Input type="date" min={todayISO()} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </Field>
      </div>

      {allergies.length ? (
        <Alert tone={allergyHits.length ? "danger" : "warning"} icon={ShieldAlert} title={allergyHits.length ? "Possível conflito com alergia registrada" : "Alergias registradas do paciente"}>
          {allergies.map((a) => `${a.substance}${a.reaction ? ` (${a.reaction})` : ""}`).join(" · ")}
          {allergyHits.length ? <span className="mt-1 block font-medium">Verifique: {allergyHits.map((i) => i.medicationName).join(", ")}.</span> : null}
        </Alert>
      ) : null}
      {needsAntimicrobial ? <Alert tone="warning">Há antimicrobiano entre os itens. Considere o tipo de receita “Antimicrobiano”.</Alert> : null}
      {needsSpecial ? <Alert tone="warning">Há medicamento sujeito a controle especial. Considere o tipo “Controle especial”.</Alert> : null}

      <datalist id="med-catalog">
        {catalog.map((c) => <option key={c.id} value={c.name}>{c.presentation}</option>)}
      </datalist>

      <AnimatePresence initial={false}>
        {items.map((item, idx) => (
          <motion.div key={item.key} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="surface-card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold"><GripVertical className="size-4 text-subtle-foreground" aria-hidden /> Medicamento {idx + 1}</h3>
              {items.length > 1 ? <Button variant="ghost" size="icon-sm" aria-label={`Remover medicamento ${idx + 1}`} onClick={() => setItems((p) => p.filter((i) => i.key !== item.key))}><Trash2 /></Button> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Medicamento" htmlFor={`name-${item.key}`} required>
                <Input
                  list="med-catalog"
                  value={item.medicationName}
                  onChange={(e) => {
                    const match = catalog.find((c) => c.name.toLowerCase() === e.target.value.toLowerCase());
                    update(item.key, { medicationName: e.target.value, medicationId: match?.id, presentation: match && !item.presentation ? match.presentation : item.presentation });
                  }}
                />
              </Field>
              <Field label="Apresentação" htmlFor={`pres-${item.key}`}><Input value={item.presentation} onChange={(e) => update(item.key, { presentation: e.target.value })} /></Field>
              <Field label="Dose" htmlFor={`dose-${item.key}`} required><Input value={item.dosage} placeholder="Ex.: 1 comprimido" onChange={(e) => update(item.key, { dosage: e.target.value })} /></Field>
              <Field label="Via" htmlFor={`route-${item.key}`}><Input value={item.route} onChange={(e) => update(item.key, { route: e.target.value })} /></Field>
              <Field label="Frequência" htmlFor={`freq-${item.key}`} required><Input value={item.frequency} placeholder="Ex.: de 12 em 12 horas" onChange={(e) => update(item.key, { frequency: e.target.value })} /></Field>
              <Field label="Vezes ao dia" htmlFor={`tpd-${item.key}`} hint="Usado para sugerir horários de lembrete ao paciente.">
                <Input type="number" min={1} max={24} value={item.timesPerDay} onChange={(e) => update(item.key, { timesPerDay: e.target.value })} />
              </Field>
            </div>
            <TimesEditor value={item.scheduleTimes} onChange={(t) => update(item.key, { scheduleTimes: t })} label="Horários sugeridos (opcional)" />
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="Duração (dias)" htmlFor={`dur-${item.key}`}><Input type="number" min={1} disabled={item.continuousUse} value={item.durationDays} onChange={(e) => update(item.key, { durationDays: e.target.value })} /></Field>
              <Field label="Quantidade" htmlFor={`qty-${item.key}`}><Input value={item.quantity} placeholder="Ex.: 1 caixa" onChange={(e) => update(item.key, { quantity: e.target.value })} /></Field>
              <label className="flex h-11 items-center gap-2 text-sm"><Switch checked={item.continuousUse} onCheckedChange={(v) => update(item.key, { continuousUse: v })} /> Uso contínuo</label>
            </div>
            <Field label="Orientações do item" htmlFor={`inst-${item.key}`}><Input value={item.instructions} placeholder="Ex.: tomar após as refeições" onChange={(e) => update(item.key, { instructions: e.target.value })} /></Field>
          </motion.div>
        ))}
      </AnimatePresence>
      <Button variant="soft" onClick={() => setItems((p) => [...p, emptyItem()])} disabled={items.length >= 20}><Plus /> Adicionar medicamento</Button>

      <div className="surface-card p-5">
        <Field label="Orientações gerais" htmlFor="rx-general"><Textarea value={general} onChange={(e) => setGeneral(e.target.value)} rows={3} /></Field>
      </div>

      {errors ? <Alert tone="danger">{errors}</Alert> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => router.back()}>Cancelar</Button>
        <Button size="lg" loading={saving} onClick={save} disabled={!patientId}>Salvar rascunho e revisar</Button>
      </div>
    </div>
  );
}
