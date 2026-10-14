import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

config({ path: ".env.local" });

export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!/127\.0\.0\.1|localhost/.test(URL)) throw new Error("Testes de integração rodam apenas contra o Supabase local.");

export const service = createClient<Database>(URL, SERVICE, { auth: { persistSession: false } });
export const anon = () => createClient<Database>(URL, ANON, { auth: { persistSession: false } });

const run = Date.now().toString(36);
const PASSWORD = "Teste12345!";

export type TestUser = { id: string; email: string; client: SupabaseClient<Database> };

export async function createUser(label: string, role: "patient" | "doctor" | "pharmacy" | "admin"): Promise<TestUser> {
  const email = `${label}.${run}@test.genvity.local`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Teste ${label}`, role },
  });
  if (error || !data.user) throw error;
  const client = anon();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

export async function makePatient(label: string) {
  const u = await createUser(label, "patient");
  const { error } = await u.client.rpc("complete_patient_onboarding", {
    p_full_name: `Paciente ${label}`,
    p_birth_date: "1970-01-01",
    p_phone: "11999990000",
    p_city: "São Paulo",
    p_state: "SP",
  });
  if (error) throw error;
  return u;
}

/** Médico verificado com agenda todos os dias, 0h–24h (para sempre haver horário). */
export async function makeVerifiedDoctor(label: string) {
  const u = await createUser(label, "doctor");
  await service.from("profiles").update({ onboarding_completed: true }).eq("id", u.id);
  const { error } = await service.from("doctors").insert({
    id: u.id,
    crm: String(100000 + Math.floor(Math.random() * 899999)),
    crm_state: "SP",
    specialty: "Clínica médica",
    messaging_enabled: true,
    verification_status: "approved",
    verified_at: new Date().toISOString(),
  });
  if (error) throw error;
  await service.from("doctor_availability").insert(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ doctor_id: u.id, weekday, start_time: "00:00", end_time: "23:30", slot_minutes: 30, modality: "in_person" as const })),
  );
  return u;
}

export async function makeVerifiedPharmacy(label: string, approved = true) {
  const u = await createUser(label, "pharmacy");
  const cnpjBase = String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
  const { data, error } = await service
    .from("pharmacies")
    .insert({
      owner_id: u.id,
      trade_name: `Farmácia ${label}`,
      legal_name: `Farmácia ${label} Ltda`,
      cnpj: `${cnpjBase}00`,
      afe_number: "AFE-TESTE",
      technical_responsible: "RT Teste",
      technical_responsible_crf: "CRF-SP 1",
      address_line: "Rua Teste, 1",
      city: "São Paulo",
      state: "SP",
      latitude: -23.56,
      longitude: -46.65,
      verification_status: approved ? "approved" : "under_review",
    })
    .select("id")
    .single();
  if (error) throw error;
  await service.from("pharmacy_members").insert({ pharmacy_id: data.id, profile_id: u.id, member_role: "owner" });
  await service.from("profiles").update({ onboarding_completed: true }).eq("id", u.id);
  return { ...u, pharmacyId: data.id };
}

/** Agenda e confirma uma consulta, ativando o vínculo médico-paciente. */
export async function linkDoctorPatient(doctor: TestUser, patient: TestUser, shareHistory = false) {
  const { data: slots, error: slotErr } = await patient.client.rpc("get_available_slots", {
    p_doctor: doctor.id,
    p_from: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    p_days: 3,
  });
  if (slotErr || !slots?.length) throw slotErr ?? new Error("sem horários");
  const slot = slots[Math.floor(Math.random() * slots.length)]!;
  const { data: apptId, error } = await patient.client.rpc("request_appointment", {
    p_doctor: doctor.id,
    p_starts_at: slot.starts_at,
    p_modality: slot.modality,
    p_reason: "Rotina",
    p_share_history: shareHistory,
    p_share_documents: false,
  });
  if (error) throw error;
  const { error: confirmErr } = await doctor.client.rpc("doctor_update_appointment", { p_id: apptId!, p_action: "confirm", p_reason: "" });
  if (confirmErr) throw confirmErr;
  return apptId!;
}

/** Cria, submete e emite (via service_role, simulando o servidor) uma prescrição. */
export async function issuePrescription(doctor: TestUser, patientId: string) {
  const { data: rx, error } = await doctor.client
    .from("prescriptions")
    .insert({ doctor_id: doctor.id, patient_id: patientId, kind: "simple", valid_until: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10) })
    .select("id")
    .single();
  if (error) throw error;
  const { error: itemErr } = await doctor.client.from("prescription_items").insert({
    prescription_id: rx.id,
    medication_name: "Medicamento de teste",
    dosage: "1 comprimido",
    frequency: "12/12h",
    times_per_day: 2,
    duration_days: 7,
  });
  if (itemErr) throw itemErr;
  const { data: hash, error: subErr } = await doctor.client.rpc("submit_prescription", { p_id: rx.id });
  if (subErr) throw subErr;
  const { data: code, error: finErr } = await service.rpc("finalize_prescription_issue", {
    p_id: rx.id,
    p_actor: doctor.id,
    p_signed_hash: hash!,
    p_provider: "dev-unsigned",
    p_reference: "test",
    p_legally_valid: false,
  });
  if (finErr) throw finErr;
  return { id: rx.id, code: code! };
}
