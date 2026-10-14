"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { toast } from "sonner";
import { Clock, LocateFixed, MapPin, Navigation, Phone, Search, Send } from "lucide-react";
import { createPharmacyRequestAction } from "@/server/actions/patient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import { FavoriteButton } from "./favorite-button";
import type { ActionResult } from "@/lib/action-result";
import { STOCK_STATUS } from "@/lib/labels";
import { fmt } from "@/lib/format";

const PharmacyMap = dynamic(() => import("./pharmacy-map"), { ssr: false, loading: () => <Skeleton className="h-full w-full rounded-2xl" /> });

export type PharmacyResult = {
  id: string;
  trade_name: string;
  address_line: string;
  district: string | null;
  city: string;
  state: string;
  phone: string | null;
  opening_hours: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
  has_inventory_data: boolean;
  matches: { product_name: string; presentation: string | null; stock_status: "available" | "low" | "unavailable"; updated_at: string; source: string }[];
};

export function PharmacySearch({
  results,
  query,
  center,
  favorites,
  validPrescriptions,
  preselectedPrescription,
}: {
  results: PharmacyResult[];
  query: string;
  center: { lat: number; lng: number } | null;
  favorites: string[];
  validPrescriptions: { id: string; label: string }[];
  preselectedPrescription?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [locating, setLocating] = React.useState(false);
  const [requestFor, setRequestFor] = React.useState<PharmacyResult | null>(null);

  function navigate(next: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    router.push(`/paciente/farmacias?${params.toString()}`);
  }

  function locate() {
    if (!("geolocation" in navigator)) return toast.error("Localização indisponível neste navegador.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        navigate({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) });
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter sua localização. Verifique a permissão do navegador.");
      },
      { timeout: 10000 },
    );
  }

  const mapPoints = results
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({ id: r.id, name: r.trade_name, lat: r.latitude!, lng: r.longitude!, available: r.matches.some((m) => m.stock_status !== "unavailable") }));

  return (
    <div className="space-y-5">
      <form
        role="search"
        className="surface-card flex flex-col gap-3 p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() || null });
        }}
      >
        <label className="sr-only" htmlFor="pharm-q">Medicamento</label>
        <Input id="pharm-q" name="q" defaultValue={query} placeholder="Buscar medicamento (ex.: losartana)" className="flex-1" />
        <Button type="submit"><Search /> Buscar</Button>
        <Button type="button" variant="secondary" onClick={locate} loading={locating}><LocateFixed /> {center ? "Atualizar localização" : "Usar minha localização"}</Button>
      </form>

      <Alert tone="info">
        A disponibilidade exibida é a informada por cada farmácia, com a data da última atualização. Confirme com a farmácia antes de se deslocar.
      </Alert>

      {results.length === 0 ? (
        <div className="surface-card"><EmptyState icon={MapPin} title="Nenhuma farmácia verificada encontrada" description={center ? "Não há farmácias verificadas no raio pesquisado." : "Ainda não há farmácias verificadas cadastradas."} /></div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <ul className="space-y-3">
            {results.map((r) => (
              <li key={r.id} className="surface-card p-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground-strong">{r.trade_name}</p>
                    <p className="text-sm text-muted-foreground">{r.address_line}{r.district ? `, ${r.district}` : ""} · {r.city}/{r.state}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
                      {r.distance_km != null ? <span className="flex items-center gap-1"><Navigation className="size-3.5" /> {r.distance_km.toFixed(1).replace(".", ",")} km</span> : null}
                      {r.opening_hours ? <span className="flex items-center gap-1"><Clock className="size-3.5" /> {r.opening_hours}</span> : null}
                      {r.phone ? <a href={`tel:${r.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="size-3.5" /> {r.phone}</a> : null}
                    </div>
                  </div>
                  <FavoriteButton type="pharmacy" id={r.id} initial={favorites.includes(r.id)} label={r.trade_name} />
                </div>
                {query ? (
                  <div className="mt-4 rounded-xl bg-surface-muted p-3">
                    {r.matches.length ? (
                      <ul className="space-y-2">
                        {r.matches.map((m, i) => (
                          <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="font-medium text-foreground-strong">{m.product_name}{m.presentation ? <span className="font-normal text-muted-foreground"> · {m.presentation}</span> : null}</span>
                            <span className="flex items-center gap-2">
                              <Badge tone={STOCK_STATUS[m.stock_status].tone}>{STOCK_STATUS[m.stock_status].label}</Badge>
                              <span className="text-caption text-muted-foreground">atualizado {fmt.relative(m.updated_at)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {r.has_inventory_data ? "Produto não informado no estoque desta farmácia." : "Esta farmácia ainda não integrou dados de estoque. Consulte diretamente."}
                      </p>
                    )}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setRequestFor(r)}><Send /> Enviar solicitação</Button>
                  {r.latitude != null ? (
                    <Button asChild size="sm" variant="secondary">
                      <a href={`https://www.openstreetmap.org/directions?to=${r.latitude},${r.longitude}`} target="_blank" rel="noopener noreferrer"><MapPin /> Como chegar</a>
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="h-[360px] overflow-hidden rounded-2xl border border-border lg:sticky lg:top-24 lg:h-[560px]">
            {mapPoints.length || center ? <PharmacyMap pharmacies={mapPoints} center={center} /> : <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">As farmácias encontradas não informaram localização no mapa.</div>}
          </div>
        </div>
      )}

      <Dialog open={!!requestFor} onOpenChange={(v) => !v && setRequestFor(null)}>
        {requestFor ? (
          <DialogContent title={`Solicitação para ${requestFor.trade_name}`} description="A farmácia confere a receita e informa o andamento pelo app.">
            <RequestForm pharmacyId={requestFor.id} prescriptions={validPrescriptions} preselected={preselectedPrescription} query={query} onDone={() => setRequestFor(null)} />
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function RequestForm({ pharmacyId, prescriptions, preselected, query, onDone }: { pharmacyId: string; prescriptions: { id: string; label: string }[]; preselected?: string; query: string; onDone: () => void }) {
  const [rx, setRx] = React.useState(preselected && prescriptions.some((p) => p.id === preselected) ? preselected : "");
  const [state, action] = useActionState<ActionResult, FormData>(async (prev, fd) => {
    const r = await createPharmacyRequestAction(prev, fd);
    if (r.ok) {
      toast.success(r.message);
      onDone();
    }
    return r;
  }, { ok: false, error: "" });
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormStatus state={state.ok ? undefined : state} />
      <input type="hidden" name="pharmacyId" value={pharmacyId} />
      <Field label="Receita (opcional)" htmlFor="prescriptionId">
        <NativeSelect name="prescriptionId" value={rx} onChange={(e) => setRx(e.target.value)}>
          <option value="">Sem receita — apenas consulta</option>
          {prescriptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Produtos" htmlFor="itemsDescription" error={fieldError(state, "itemsDescription")}>
        <Textarea name="itemsDescription" rows={2} defaultValue={query} placeholder="O que você precisa?" />
      </Field>
      <Field label="Observação para a farmácia" htmlFor="note">
        <Input name="note" placeholder="Ex.: retiro no fim da tarde" />
      </Field>
      {rx ? (
        <label className="flex items-start gap-3 rounded-2xl border border-border p-3 text-sm">
          <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-[var(--primary)]" />
          <span>Autorizo esta farmácia a visualizar a receita selecionada (medicamentos, médico prescritor, meu nome e data de nascimento) para conferência.</span>
        </label>
      ) : null}
      {fieldError(state, "consent") ? <p role="alert" className="text-caption text-danger-foreground">{fieldError(state, "consent")}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancelar</Button>
        <SubmitButton pendingLabel="Enviando…">Enviar</SubmitButton>
      </div>
    </form>
  );
}
