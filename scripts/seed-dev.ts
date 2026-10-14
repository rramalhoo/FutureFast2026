/**
 * Cria contas FICTÍCIAS de demonstração para desenvolvimento local.
 * Recusa-se a rodar fora de localhost ou com APP_ENV=production.
 *
 *   npm run seed:dev
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (process.env.APP_ENV === "production" || !/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
  console.error("Seed de demonstração permitido somente no Supabase local.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
export const DEMO_PASSWORD = "Genvity2026!";

async function ensureUser(email: string, fullName: string, role: string) {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error || !data.user) throw error ?? new Error("createUser falhou");
  return data.user.id;
}

async function main() {
  const adminId = await ensureUser("admin@demo.genvity.local", "Administração Demo", "patient");
  await admin.from("profiles").update({ role: "admin", onboarding_completed: true }).eq("id", adminId);

  // Médico fictício já verificado, com agenda de segunda a sexta.
  const doctorId = await ensureUser("medica@demo.genvity.local", "Dra. Helena Demonstração", "doctor");
  await admin.from("profiles").update({ onboarding_completed: true }).eq("id", doctorId);
  await admin.from("doctors").upsert({
    id: doctorId,
    crm: "999001",
    crm_state: "SP",
    specialty: "Clínica médica",
    city: "São Paulo",
    state: "SP",
    modalities: ["in_person", "telehealth"],
    bio: "Perfil fictício de demonstração do Genvity.",
    messaging_enabled: true,
    verification_status: "approved",
    verified_at: new Date().toISOString(),
  });
  const { count: availCount } = await admin.from("doctor_availability").select("id", { count: "exact", head: true }).eq("doctor_id", doctorId);
  if (!availCount) {
    await admin.from("doctor_availability").insert(
      [1, 2, 3, 4, 5].flatMap((weekday) => [
        { doctor_id: doctorId, weekday, start_time: "08:00", end_time: "12:00", slot_minutes: 30, modality: "in_person" as const },
        { doctor_id: doctorId, weekday, start_time: "14:00", end_time: "18:00", slot_minutes: 30, modality: "telehealth" as const },
      ]),
    );
  }

  // Farmácia fictícia verificada.
  const pharmacyUserId = await ensureUser("farmacia@demo.genvity.local", "Responsável Farmácia Demo", "pharmacy");
  await admin.from("profiles").update({ onboarding_completed: true }).eq("id", pharmacyUserId);
  let { data: pharmacy } = await admin.from("pharmacies").select("id").eq("owner_id", pharmacyUserId).maybeSingle();
  if (!pharmacy) {
    const { data } = await admin
      .from("pharmacies")
      .insert({
        owner_id: pharmacyUserId,
        trade_name: "Farmácia Demonstração",
        legal_name: "Farmácia Demonstração Ltda (fictícia)",
        cnpj: "11222333000181",
        afe_number: "DEMO-0001",
        technical_responsible: "Farmacêutico Demonstração",
        technical_responsible_crf: "CRF-SP 00000",
        phone: "11900000000",
        address_line: "Avenida Paulista, 1000",
        district: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        postal_code: "01310100",
        latitude: -23.5649,
        longitude: -46.6519,
        opening_hours: "Seg–Sáb 8h–22h",
        verification_status: "approved",
        verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    pharmacy = data;
    await admin.from("pharmacy_members").insert({ pharmacy_id: data!.id, profile_id: pharmacyUserId, member_role: "owner" });
    const { data: meds } = await admin.from("medications").select("id, name, presentation").limit(8);
    await admin.from("pharmacy_inventory").insert(
      (meds ?? []).map((m, i) => ({
        pharmacy_id: data!.id,
        medication_id: m.id,
        product_name: m.name,
        presentation: m.presentation,
        quantity: i % 4 === 3 ? 0 : 20 + i,
        stock_status: (i % 4 === 3 ? "unavailable" : i % 4 === 2 ? "low" : "available") as "available",
      })),
    );
  }

  // Paciente fictício com cadastro concluído (sem dados clínicos).
  const patientId = await ensureUser("paciente@demo.genvity.local", "Paciente Demonstração", "patient");
  await admin.from("profiles").update({ onboarding_completed: true }).eq("id", patientId);
  await admin.from("patients").upsert({ id: patientId, birth_date: "1960-05-10", phone: "11911111111", city: "São Paulo", state: "SP" });

  console.log("\nContas fictícias de demonstração (senha: %s)", DEMO_PASSWORD);
  console.log("  admin@demo.genvity.local      → /admin");
  console.log("  medica@demo.genvity.local     → /medico (CRM verificado)");
  console.log("  farmacia@demo.genvity.local   → /farmacia (verificada)");
  console.log("  paciente@demo.genvity.local   → /paciente\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
