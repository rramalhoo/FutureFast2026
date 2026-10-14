"use client";

import * as React from "react";
import { useActionState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Download, LogOut, Monitor, Moon, Sun } from "lucide-react";
import {
  changePasswordAction,
  createDsrAction,
  signOutEverywhereAction,
  updatePatientDetailsAction,
  updatePreferencesAction,
  updateProfileAction,
} from "@/server/actions/account";
import { Field } from "@/components/ui/field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FormStatus, PasswordInput, SubmitButton, fieldError } from "@/components/shared/form";
import { StateSelect } from "@/components/onboarding/state-select";
import { useA11yPreferences } from "@/components/shared/providers";
import type { ActionResult } from "@/lib/action-result";
import type { Tables } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const initial: ActionResult = { ok: false, error: "" };

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action] = useActionState(updateProfileAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormStatus state={state} />
      <Field label="Nome completo" htmlFor="fullName" error={fieldError(state, "fullName")}>
        <Input name="fullName" defaultValue={fullName} autoComplete="name" />
      </Field>
      <Field label="E-mail" htmlFor="email" hint="Para alterar o e-mail, entre em contato com o suporte.">
        <Input name="email" value={email} readOnly disabled />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
      </div>
    </form>
  );
}

export function PatientDetailsForm({ patient }: { patient: Tables<"patients"> }) {
  const [state, action] = useActionState(updatePatientDetailsAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormStatus state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Data de nascimento" htmlFor="birthDate" error={fieldError(state, "birthDate")}>
          <Input name="birthDate" type="date" defaultValue={patient.birth_date ?? ""} />
        </Field>
        <Field label="Celular" htmlFor="phone" error={fieldError(state, "phone")}>
          <Input name="phone" type="tel" defaultValue={patient.phone ?? ""} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
        <Field label="Cidade" htmlFor="city" error={fieldError(state, "city")}>
          <Input name="city" defaultValue={patient.city ?? ""} />
        </Field>
        <Field label="UF" htmlFor="state" error={fieldError(state, "state")}>
          <StateSelect name="state" defaultValue={patient.state ?? ""} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="CPF" htmlFor="cpf" error={fieldError(state, "cpf")}>
          <Input name="cpf" inputMode="numeric" defaultValue={patient.cpf ?? ""} />
        </Field>
        <Field label="Sexo" htmlFor="sex" error={fieldError(state, "sex")}>
          <NativeSelect name="sex" defaultValue={patient.sex ?? ""}>
            <option value="">Prefiro não informar</option>
            <option value="female">Feminino</option>
            <option value="male">Masculino</option>
            <option value="other">Outro</option>
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contato de emergência" htmlFor="emergencyContactName" error={fieldError(state, "emergencyContactName")}>
          <Input name="emergencyContactName" defaultValue={patient.emergency_contact_name ?? ""} />
        </Field>
        <Field label="Telefone do contato" htmlFor="emergencyContactPhone" error={fieldError(state, "emergencyContactPhone")}>
          <Input name="emergencyContactPhone" type="tel" defaultValue={patient.emergency_contact_phone ?? ""} />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Salvando…">Salvar dados</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initial);
  const ref = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-5" noValidate>
      <FormStatus state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nova senha" htmlFor="password" error={fieldError(state, "password")}>
          <PasswordInput name="password" autoComplete="new-password" />
        </Field>
        <Field label="Confirmar nova senha" htmlFor="confirmPassword" error={fieldError(state, "confirmPassword")}>
          <PasswordInput name="confirmPassword" autoComplete="new-password" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Alterando…">Alterar senha</SubmitButton>
      </div>
    </form>
  );
}

export function SignOutOthersButton() {
  const [pending, start] = React.useTransition();
  return (
    <Button
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await signOutEverywhereAction();
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        })
      }
    >
      <LogOut /> Encerrar outras sessões
    </Button>
  );
}

type Notifs = { appointment?: boolean; prescription?: boolean; message?: boolean; pharmacy_request?: boolean; medication_reminders?: boolean };

export function PreferencesPanel({ initialPrefs }: { initialPrefs: { fontScale?: "md" | "lg" | "xl"; highContrast?: boolean; reduceMotion?: boolean; notifications?: Notifs } }) {
  const { theme, setTheme } = useTheme();
  const { setPrefs } = useA11yPreferences();
  const [prefs, setLocal] = React.useState(initialPrefs);
  const [pending, start] = React.useTransition();

  function save(next: typeof prefs) {
    setLocal(next);
    setPrefs({ fontScale: next.fontScale, highContrast: next.highContrast, reduceMotion: next.reduceMotion });
    start(async () => {
      const r = await updatePreferencesAction(next);
      if (!r.ok) toast.error(r.error);
    });
  }

  const notif = prefs.notifications ?? {};
  const notifRows: { key: keyof Notifs; label: string; hint: string }[] = [
    { key: "medication_reminders", label: "Lembretes de medicação", hint: "Avisos no app nos horários das doses." },
    { key: "appointment", label: "Consultas", hint: "Solicitações, confirmações e cancelamentos." },
    { key: "prescription", label: "Receitas", hint: "Emissões, cancelamentos e consultas por farmácias." },
    { key: "message", label: "Mensagens", hint: "Novas mensagens seguras." },
    { key: "pharmacy_request", label: "Solicitações à farmácia", hint: "Andamento das solicitações." },
  ];

  return (
    <div className="space-y-8" aria-busy={pending}>
      <section>
        <h3 className="font-semibold text-foreground-strong">Tema</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:max-w-md">
          {[
            { v: "light", l: "Claro", i: Sun },
            { v: "dark", l: "Escuro", i: Moon },
            { v: "system", l: "Sistema", i: Monitor },
          ].map(({ v, l, i: Icon }) => (
            <button
              key={v}
              onClick={() => setTheme(v)}
              aria-pressed={theme === v}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-4 text-sm font-medium transition-colors hover:border-border-strong aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary-soft-foreground"
            >
              <Icon className="size-5" aria-hidden /> {l}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3 className="font-semibold text-foreground-strong">Acessibilidade</h3>
        <div className="mt-3 space-y-3">
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-medium text-foreground-strong" id="font-scale-label">Tamanho do texto</p>
            <div className="mt-3 flex gap-2" role="radiogroup" aria-labelledby="font-scale-label">
              {[
                { v: "md", l: "Padrão", c: "text-sm" },
                { v: "lg", l: "Grande", c: "text-base" },
                { v: "xl", l: "Muito grande", c: "text-lg" },
              ].map((o) => (
                <button
                  key={o.v}
                  role="radio"
                  aria-checked={(prefs.fontScale ?? "md") === o.v}
                  onClick={() => save({ ...prefs, fontScale: o.v as "md" | "lg" | "xl" })}
                  className={cn(
                    "flex-1 rounded-xl border border-border px-3 py-2.5 font-medium transition-colors aria-checked:border-primary aria-checked:bg-primary-soft aria-checked:text-primary-soft-foreground",
                    o.c,
                  )}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <ToggleRow label="Alto contraste" hint="Aumenta o contraste de textos e bordas." checked={!!prefs.highContrast} onChange={(v) => save({ ...prefs, highContrast: v })} />
          <ToggleRow label="Reduzir movimento" hint="Desativa animações e transições." checked={!!prefs.reduceMotion} onChange={(v) => save({ ...prefs, reduceMotion: v })} />
        </div>
      </section>
      <section>
        <h3 className="font-semibold text-foreground-strong">Notificações no app</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Notificações push dependem da configuração de um serviço de envio e ainda não estão ativas.
        </p>
        <div className="mt-3 space-y-3">
          {notifRows.map((r) => (
            <ToggleRow
              key={r.key}
              label={r.label}
              hint={r.hint}
              checked={notif[r.key] !== false}
              onChange={(v) => save({ ...prefs, notifications: { ...notif, [r.key]: v } })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = React.useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-foreground-strong">
          {label}
        </label>
        <p className="text-caption text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function DsrForm() {
  const [state, action] = useActionState(createDsrAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormStatus state={state} />
      <Field label="Tipo de solicitação" htmlFor="kind">
        <NativeSelect name="kind" defaultValue="correction">
          <option value="correction">Correção de dados</option>
          <option value="deletion">Exclusão de conta e dados</option>
          <option value="access_report">Relatório completo de acessos</option>
          <option value="export">Cópia dos dados (atendimento humano)</option>
        </NativeSelect>
      </Field>
      <Field label="Detalhes" htmlFor="details" error={fieldError(state, "details")}>
        <Textarea name="details" placeholder="Descreva o que precisa." />
      </Field>
      <div className="flex justify-end">
        <SubmitButton variant="secondary" pendingLabel="Enviando…">
          Enviar solicitação
        </SubmitButton>
      </div>
    </form>
  );
}

export function ExportButton() {
  return (
    <Button asChild variant="secondary">
      <a href="/api/privacy/export" download>
        <Download /> Baixar meus dados (JSON)
      </a>
    </Button>
  );
}
