"use client";

import { useActionState, useState } from "react";
import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { completePharmacyOnboarding } from "@/server/actions/onboarding";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ActionForm, FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload";
import { StateSelect } from "./state-select";
import type { ActionResult } from "@/lib/action-result";

export function PharmacyOnboardingForm({ defaultName, userId }: { defaultName: string; userId: string }) {
  const [state, action] = useActionState<ActionResult, FormData>(completePharmacyOnboarding, { ok: false, error: "" });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [coords, setCoords] = useState<{ lat: string; lng: string }>({ lat: "", lng: "" });
  const [locating, setLocating] = useState(false);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Seu navegador não permite obter a localização.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
        setLocating(false);
        toast.success("Localização preenchida. Confira se corresponde ao endereço da farmácia.");
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter a localização.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <ActionForm action={action} className="space-y-6" noValidate>
      <FormStatus state={state} />
      <Field label="Seu nome (responsável pela conta)" htmlFor="fullName" required error={fieldError(state, "fullName")}>
        <Input name="fullName" defaultValue={defaultName} autoComplete="name" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome fantasia" htmlFor="tradeName" required error={fieldError(state, "tradeName")}>
          <Input name="tradeName" />
        </Field>
        <Field label="Razão social" htmlFor="legalName" required error={fieldError(state, "legalName")}>
          <Input name="legalName" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="CNPJ" htmlFor="cnpj" required error={fieldError(state, "cnpj")}>
          <Input name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" />
        </Field>
        <Field label="Nº da AFE (ANVISA)" htmlFor="afeNumber" required error={fieldError(state, "afeNumber")}>
          <Input name="afeNumber" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Farmacêutico(a) responsável técnico" htmlFor="technicalResponsible" required error={fieldError(state, "technicalResponsible")}>
          <Input name="technicalResponsible" />
        </Field>
        <Field label="CRF do responsável técnico" htmlFor="technicalResponsibleCrf" required error={fieldError(state, "technicalResponsibleCrf")}>
          <Input name="technicalResponsibleCrf" placeholder="CRF-SP 00000" />
        </Field>
      </div>
      <Field label="Telefone" htmlFor="phone" required error={fieldError(state, "phone")}>
        <Input name="phone" type="tel" inputMode="tel" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
        <Field label="Endereço" htmlFor="addressLine" required error={fieldError(state, "addressLine")}>
          <Input name="addressLine" autoComplete="street-address" placeholder="Rua, número" />
        </Field>
        <Field label="CEP" htmlFor="postalCode" required error={fieldError(state, "postalCode")}>
          <Input name="postalCode" inputMode="numeric" autoComplete="postal-code" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_1fr_120px]">
        <Field label="Bairro" htmlFor="district" error={fieldError(state, "district")}>
          <Input name="district" />
        </Field>
        <Field label="Cidade" htmlFor="city" required error={fieldError(state, "city")}>
          <Input name="city" autoComplete="address-level2" />
        </Field>
        <Field label="UF" htmlFor="state" required error={fieldError(state, "state")}>
          <StateSelect name="state" />
        </Field>
      </div>
      <div className="rounded-2xl border border-border bg-surface-muted p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Latitude" htmlFor="latitude" className="flex-1" error={fieldError(state, "latitude")}>
            <Input name="latitude" inputMode="decimal" value={coords.lat} onChange={(e) => setCoords((c) => ({ ...c, lat: e.target.value }))} />
          </Field>
          <Field label="Longitude" htmlFor="longitude" className="flex-1" error={fieldError(state, "longitude")}>
            <Input name="longitude" inputMode="decimal" value={coords.lng} onChange={(e) => setCoords((c) => ({ ...c, lng: e.target.value }))} />
          </Field>
          <Button type="button" variant="secondary" onClick={useCurrentLocation} loading={locating}>
            <LocateFixed /> Usar localização atual
          </Button>
        </div>
        <p className="mt-2 text-caption text-muted-foreground">
          Opcional. Com coordenadas, sua farmácia aparece no mapa e na busca por proximidade.
        </p>
      </div>
      <Field label="Horário de funcionamento" htmlFor="openingHours" error={fieldError(state, "openingHours")}>
        <Input name="openingHours" placeholder="Seg–Sex 8h–20h · Sáb 8h–14h" />
      </Field>
      <FileUpload
        bucket="verification-documents"
        folder={userId}
        name="documentPaths"
        label="AFE, licença sanitária e certidão de regularidade técnica (CRF)"
        onChange={setFiles}
      />
      <div className="flex justify-end">
        <SubmitButton size="lg" disabled={files.length === 0} pendingLabel="Enviando…">
          Enviar para verificação
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
