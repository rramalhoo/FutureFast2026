import { z } from "zod";
import { BR_STATES } from "@/lib/labels";
import { digits } from "@/lib/utils";
import { isValidCnpj, isValidCpf } from "./documents";

const trimmed = (min: number, max: number, msg: string) =>
  z.string().trim().min(min, msg).max(max, `Máximo de ${max} caracteres.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido."));

export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "Inclua ao menos uma letra.")
  .regex(/\d/, "Inclua ao menos um número.");

export const stateSchema = z.enum(BR_STATES, { message: "Selecione o estado." });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------
export const signUpSchema = z
  .object({
    fullName: trimmed(3, 160, "Informe seu nome completo."),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(["patient", "doctor", "pharmacy"], { message: "Escolha o tipo de conta." }),
    acceptTerms: z.literal("on", { message: "É necessário aceitar os termos e a política de privacidade." }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
  next: z.string().optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "As senhas não coincidem." });

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------
export const patientOnboardingSchema = z.object({
  fullName: trimmed(3, 160, "Informe seu nome completo."),
  birthDate: isoDate.refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    return d < new Date() && d > new Date("1900-01-01");
  }, "Data de nascimento inválida."),
  phone: z
    .string()
    .transform(digits)
    .refine((v) => v.length >= 10 && v.length <= 11, "Telefone com DDD (10 ou 11 dígitos)."),
  city: trimmed(2, 120, "Informe sua cidade."),
  state: stateSchema,
  cpf: z
    .string()
    .optional()
    .transform((v) => (v ? digits(v) : undefined))
    .refine((v) => !v || isValidCpf(v), "CPF inválido."),
  sex: z.enum(["female", "male", "other", "not_informed"]).optional(),
});

export const doctorOnboardingSchema = z.object({
  fullName: trimmed(3, 160, "Informe seu nome completo."),
  crm: z
    .string()
    .transform(digits)
    .refine((v) => v.length >= 4 && v.length <= 10, "CRM deve ter de 4 a 10 dígitos."),
  crmState: stateSchema,
  specialty: trimmed(2, 120, "Informe a especialidade."),
  rqe: optionalText(20),
  city: trimmed(2, 120, "Informe a cidade de atendimento."),
  state: stateSchema,
  modalities: z
    .array(z.enum(["in_person", "telehealth"]))
    .min(1, "Selecione ao menos uma modalidade."),
  bio: optionalText(1200),
});

export const pharmacyOnboardingSchema = z.object({
  fullName: trimmed(3, 160, "Informe o nome do responsável pela conta."),
  tradeName: trimmed(2, 160, "Informe o nome fantasia."),
  legalName: trimmed(2, 200, "Informe a razão social."),
  cnpj: z.string().transform(digits).refine(isValidCnpj, "CNPJ inválido."),
  afeNumber: trimmed(3, 40, "Informe o número da AFE (ANVISA)."),
  technicalResponsible: trimmed(2, 160, "Informe o farmacêutico responsável técnico."),
  technicalResponsibleCrf: trimmed(3, 30, "Informe o CRF do responsável técnico."),
  phone: z
    .string()
    .transform(digits)
    .refine((v) => v.length >= 10 && v.length <= 11, "Telefone com DDD."),
  addressLine: trimmed(3, 240, "Informe o endereço."),
  district: optionalText(120),
  city: trimmed(2, 120, "Informe a cidade."),
  state: stateSchema,
  postalCode: z
    .string()
    .transform(digits)
    .refine((v) => v.length === 8, "CEP com 8 dígitos."),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  openingHours: optionalText(300),
});

// ---------------------------------------------------------------------------
// Conta
// ---------------------------------------------------------------------------
export const profileUpdateSchema = z.object({
  fullName: trimmed(3, 160, "Informe seu nome completo."),
});

export const patientDetailsSchema = patientOnboardingSchema.omit({ fullName: true }).extend({
  emergencyContactName: optionalText(160),
  emergencyContactPhone: z
    .string()
    .optional()
    .transform((v) => (v ? digits(v) : undefined)),
});

export const changePasswordSchema = resetPasswordSchema;

export const doctorProfileSchema = z.object({
  specialty: trimmed(2, 120, "Informe a especialidade."),
  rqe: optionalText(20),
  bio: optionalText(1200),
  city: trimmed(2, 120, "Informe a cidade."),
  state: stateSchema,
  modalities: z.array(z.enum(["in_person", "telehealth"])).min(1, "Selecione ao menos uma modalidade."),
  acceptingNewPatients: z.boolean(),
  messagingEnabled: z.boolean(),
});

// ---------------------------------------------------------------------------
// Clínico
// ---------------------------------------------------------------------------
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido (HH:MM).");

export const prescriptionItemSchema = z.object({
  medicationId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  medicationName: trimmed(2, 200, "Informe o medicamento."),
  presentation: optionalText(200),
  dosage: trimmed(1, 200, "Informe a dose."),
  route: optionalText(80),
  frequency: trimmed(1, 200, "Informe a frequência."),
  timesPerDay: z.coerce.number().int().min(1).max(24).optional(),
  scheduleTimes: z.array(timeSchema).max(24).default([]),
  durationDays: z.coerce.number().int().min(1).max(3650).optional(),
  continuousUse: z.boolean().default(false),
  quantity: optionalText(120),
  instructions: optionalText(1000),
});

export const prescriptionDraftSchema = z.object({
  patientId: z.uuid("Selecione o paciente."),
  kind: z.enum(["simple", "antimicrobial", "special_control"]),
  validUntil: isoDate,
  generalInstructions: optionalText(2000),
  consultationId: z.uuid().optional(),
  items: z.array(prescriptionItemSchema).min(1, "Adicione ao menos um medicamento.").max(20),
});

export const consultationSchema = z.object({
  patientId: z.uuid(),
  appointmentId: z.uuid().optional(),
  occurredAt: z.string().min(1, "Informe a data."),
  reason: optionalText(500),
  summaryForPatient: optionalText(4000),
  clinicalNote: optionalText(8000),
  shareNoteWithPatient: z.boolean().default(false),
  followUpDate: isoDate.optional().or(z.literal("").transform(() => undefined)),
  followUpNotes: optionalText(500),
});

export const allergySchema = z.object({
  patientId: z.uuid(),
  substance: trimmed(2, 160, "Informe a substância."),
  reaction: optionalText(500),
  severity: z.enum(["mild", "moderate", "severe", "unknown"]),
});

export const availabilitySchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    slotMinutes: z.coerce.number().int().min(10).max(240),
    modality: z.enum(["in_person", "telehealth"]),
  })
  .refine((d) => d.endTime > d.startTime, { path: ["endTime"], message: "O fim deve ser depois do início." });

export const blockSchema = z
  .object({
    date: isoDate,
    startTime: timeSchema,
    endTime: timeSchema,
    reason: optionalText(200),
  })
  .refine((d) => d.endTime > d.startTime, { path: ["endTime"], message: "O fim deve ser depois do início." });

export const personalMedicationSchema = z.object({
  name: trimmed(2, 200, "Informe o nome do medicamento."),
  presentation: optionalText(200),
  dosage: optionalText(200),
  frequency: optionalText(200),
  scheduleTimes: z.array(timeSchema).max(12).default([]),
  startDate: isoDate,
  endDate: isoDate.optional().or(z.literal("").transform(() => undefined)),
  instructions: optionalText(1000),
  treatmentLabel: optionalText(120),
});

export const reminderSchema = z.object({
  title: trimmed(2, 160, "Informe um título."),
  description: optionalText(500),
  date: isoDate,
  time: timeSchema.optional().or(z.literal("").transform(() => undefined)),
});

export const messageSchema = z.object({
  conversationId: z.uuid(),
  body: trimmed(1, 4000, "Escreva uma mensagem."),
});

// ---------------------------------------------------------------------------
// Farmácia
// ---------------------------------------------------------------------------
export const inventorySchema = z.object({
  id: z.uuid().optional(),
  productName: trimmed(2, 200, "Informe o produto."),
  presentation: optionalText(200),
  ean: z
    .string()
    .optional()
    .transform((v) => (v ? digits(v) : undefined))
    .refine((v) => !v || (v.length >= 8 && v.length <= 14), "EAN deve ter de 8 a 14 dígitos."),
  quantity: z.coerce.number().int().min(0, "Quantidade inválida.").max(1_000_000),
  stockStatus: z.enum(["available", "low", "unavailable"]),
  medicationId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
});

export const dispenseSchema = z.object({
  code: z.string().trim().regex(/^[0-9a-fA-F]{32}$/, "Código inválido."),
  pharmacistName: trimmed(2, 160, "Informe o farmacêutico responsável."),
  pharmacistCrf: trimmed(3, 30, "Informe o CRF."),
  notes: optionalText(1000),
  requestId: z.uuid().optional(),
  confirmChecks: z.literal(true, { message: "Confirme a conferência farmacêutica." }),
});

// ---------------------------------------------------------------------------
// Suporte e privacidade
// ---------------------------------------------------------------------------
export const ticketSchema = z.object({
  category: z.enum(["general", "account", "technical", "privacy", "billing", "verification"]),
  subject: trimmed(3, 160, "Informe o assunto."),
  body: trimmed(10, 4000, "Descreva com ao menos 10 caracteres."),
});

export const dsrSchema = z.object({
  kind: z.enum(["export", "deletion", "correction", "access_report"]),
  details: optionalText(2000),
});
