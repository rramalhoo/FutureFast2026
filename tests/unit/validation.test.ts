import { describe, expect, it } from "vitest";
import { isValidCnpj, isValidCpf } from "@/lib/validation/documents";
import {
  dispenseSchema,
  doctorOnboardingSchema,
  passwordSchema,
  patientOnboardingSchema,
  prescriptionDraftSchema,
  signUpSchema,
} from "@/lib/validation/schemas";

describe("documentos", () => {
  it("valida CPF pelos dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224724")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
  it("valida CNPJ pelos dígitos verificadores", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11222333000180")).toBe(false);
    expect(isValidCnpj("00000000000000")).toBe(false);
  });
});

describe("cadastro", () => {
  const base = { fullName: "Maria Teste", email: "MARIA@Exemplo.com ", password: "senhaSegura1", confirmPassword: "senhaSegura1", role: "patient", acceptTerms: "on" };
  it("aceita dados válidos e normaliza o e-mail", () => {
    const r = signUpSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBe("maria@exemplo.com");
  });
  it("nunca aceita papel admin no cadastro público", () => {
    expect(signUpSchema.safeParse({ ...base, role: "admin" }).success).toBe(false);
  });
  it("exige confirmação de senha e aceite dos termos", () => {
    expect(signUpSchema.safeParse({ ...base, confirmPassword: "outra1234" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, acceptTerms: undefined }).success).toBe(false);
  });
  it("exige senha com letras e números", () => {
    expect(passwordSchema.safeParse("abcdefgh").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("abcd1234").success).toBe(true);
  });
});

describe("onboarding", () => {
  it("paciente: telefone com DDD e data de nascimento no passado", () => {
    const ok = patientOnboardingSchema.safeParse({ fullName: "João Teste", birthDate: "1980-01-01", phone: "(11) 91234-5678", city: "São Paulo", state: "SP" });
    expect(ok.success).toBe(true);
    expect(patientOnboardingSchema.safeParse({ fullName: "João Teste", birthDate: "2999-01-01", phone: "11912345678", city: "SP", state: "SP" }).success).toBe(false);
    expect(patientOnboardingSchema.safeParse({ fullName: "João Teste", birthDate: "1980-01-01", phone: "1234", city: "São Paulo", state: "SP" }).success).toBe(false);
  });
  it("médico: CRM numérico, UF válida e ao menos uma modalidade", () => {
    const base = { fullName: "Dra. Teste", crm: "12.345", crmState: "SP", specialty: "Cardiologia", city: "Santos", state: "SP", modalities: ["in_person"] };
    const r = doctorOnboardingSchema.safeParse(base);
    expect(r.success && r.data.crm).toBe("12345");
    expect(doctorOnboardingSchema.safeParse({ ...base, crmState: "XX" }).success).toBe(false);
    expect(doctorOnboardingSchema.safeParse({ ...base, modalities: [] }).success).toBe(false);
  });
});

describe("prescrição e dispensação", () => {
  const item = { medicationName: "Losartana", dosage: "1 comprimido", frequency: "1x ao dia", scheduleTimes: ["08:00"] };
  it("exige ao menos um item e horários HH:MM", () => {
    const base = { patientId: "6f1c1c3e-8a5c-4bd2-9c0a-3a1c2b3d4e5f", kind: "simple", validUntil: "2030-01-01" };
    expect(prescriptionDraftSchema.safeParse({ ...base, items: [] }).success).toBe(false);
    expect(prescriptionDraftSchema.safeParse({ ...base, items: [item] }).success).toBe(true);
    expect(prescriptionDraftSchema.safeParse({ ...base, items: [{ ...item, scheduleTimes: ["25:00"] }] }).success).toBe(false);
  });
  it("dispensação exige código de 32 hex e confirmação da conferência", () => {
    const base = { code: "a".repeat(32), pharmacistName: "Ana", pharmacistCrf: "CRF-SP 1", confirmChecks: true };
    expect(dispenseSchema.safeParse(base).success).toBe(true);
    expect(dispenseSchema.safeParse({ ...base, confirmChecks: false }).success).toBe(false);
    expect(dispenseSchema.safeParse({ ...base, code: "xyz" }).success).toBe(false);
  });
});
