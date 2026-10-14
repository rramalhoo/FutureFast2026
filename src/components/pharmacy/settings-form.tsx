"use client";

import { useActionState } from "react";
import { updatePharmacySettingsAction } from "@/server/actions/pharmacy";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, FormStatus, SubmitButton, fieldError } from "@/components/shared/form";
import { StateSelect } from "@/components/onboarding/state-select";
import type { ActionResult } from "@/lib/action-result";
import type { Tables } from "@/lib/supabase/types";

export function PharmacySettingsForm({ pharmacy, canEdit }: { pharmacy: Tables<"pharmacies">; canEdit: boolean }) {
  const [state, action] = useActionState<ActionResult, FormData>(updatePharmacySettingsAction, { ok: false, error: "" });
  return (
    <ActionForm action={action} className="space-y-4" noValidate>
      <FormStatus state={state} />
      <fieldset disabled={!canEdit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome fantasia" htmlFor="tradeName" error={fieldError(state, "tradeName")}><Input name="tradeName" defaultValue={pharmacy.trade_name} /></Field>
          <Field label="Telefone" htmlFor="phone" error={fieldError(state, "phone")}><Input name="phone" defaultValue={pharmacy.phone ?? ""} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Field label="Endereço" htmlFor="addressLine" error={fieldError(state, "addressLine")}><Input name="addressLine" defaultValue={pharmacy.address_line} /></Field>
          <Field label="CEP" htmlFor="postalCode" error={fieldError(state, "postalCode")}><Input name="postalCode" defaultValue={pharmacy.postal_code ?? ""} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
          <Field label="Bairro" htmlFor="district"><Input name="district" defaultValue={pharmacy.district ?? ""} /></Field>
          <Field label="Cidade" htmlFor="city" error={fieldError(state, "city")}><Input name="city" defaultValue={pharmacy.city} /></Field>
          <Field label="UF" htmlFor="state" error={fieldError(state, "state")}><StateSelect name="state" defaultValue={pharmacy.state} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" htmlFor="latitude" error={fieldError(state, "latitude")}><Input name="latitude" inputMode="decimal" defaultValue={pharmacy.latitude ?? ""} /></Field>
          <Field label="Longitude" htmlFor="longitude" error={fieldError(state, "longitude")}><Input name="longitude" inputMode="decimal" defaultValue={pharmacy.longitude ?? ""} /></Field>
        </div>
        <Field label="Horário de funcionamento" htmlFor="openingHours"><Input name="openingHours" defaultValue={pharmacy.opening_hours ?? ""} /></Field>
      </fieldset>
      {canEdit ? <div className="flex justify-end"><SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton></div> : null}
    </ActionForm>
  );
}
