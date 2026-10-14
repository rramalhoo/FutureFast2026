import { beforeAll, describe, expect, it } from "vitest";
import { anon, createUser, issuePrescription, linkDoctorPatient, makePatient, makeVerifiedDoctor, makeVerifiedPharmacy, service, type TestUser } from "./helpers";

describe("autenticação e papéis", () => {
  it("o cadastro nunca concede papel admin, mesmo se pedido no metadata", async () => {
    const u = await createUser("wannabe", "admin");
    const { data } = await u.client.from("profiles").select("role").eq("id", u.id).single();
    expect(data?.role).toBe("patient");
  });

  it("usuário não consegue alterar o próprio papel", async () => {
    const u = await createUser("escalate", "patient");
    const { error } = await u.client.from("profiles").update({ role: "admin" } as never).eq("id", u.id);
    expect(error).not.toBeNull();
    const { data } = await service.from("profiles").select("role").eq("id", u.id).single();
    expect(data?.role).toBe("patient");
  });

  it("médico não consegue se autoaprovar", async () => {
    const u = await createUser("selfapprove", "doctor");
    await service.from("doctors").insert({ id: u.id, crm: "778899", crm_state: "RJ", specialty: "Pediatria" });
    const { error } = await u.client.from("doctors").update({ verification_status: "approved" } as never).eq("id", u.id);
    expect(error).not.toBeNull();
  });

  it("visitante anônimo lê planos, mas nenhum dado de usuário", async () => {
    const client = anon();
    const plans = await client.from("plans").select("slug");
    expect(plans.data?.length).toBeGreaterThan(0);
    const profiles = await client.from("profiles").select("id");
    expect(profiles.data ?? []).toHaveLength(0);
    const rx = await client.from("prescriptions").select("id");
    expect(rx.data ?? []).toHaveLength(0);
  });
});

describe("isolamento de dados entre pacientes", () => {
  let a: TestUser;
  let b: TestUser;
  beforeAll(async () => {
    a = await makePatient("iso-a");
    b = await makePatient("iso-b");
    await a.client.from("allergies").insert({ patient_id: a.id, substance: "Penicilina", recorded_by: a.id });
    await a.client.from("patient_medications").insert({ patient_id: a.id, name: "Registro pessoal A", schedule_times: ["08:00"] });
  });

  it("B não lê dados pessoais, alergias nem medicamentos de A", async () => {
    expect((await b.client.from("patients").select("*").eq("id", a.id)).data).toHaveLength(0);
    expect((await b.client.from("allergies").select("*").eq("patient_id", a.id)).data).toHaveLength(0);
    expect((await b.client.from("patient_medications").select("*").eq("patient_id", a.id)).data).toHaveLength(0);
    expect((await b.client.from("profiles").select("*").eq("id", a.id)).data).toHaveLength(0);
  });

  it("B não consegue gravar em nome de A", async () => {
    const r1 = await b.client.from("allergies").insert({ patient_id: a.id, substance: "Falsa", recorded_by: b.id });
    expect(r1.error).not.toBeNull();
    const r2 = await b.client.from("patient_medications").insert({ patient_id: a.id, name: "Injeção" });
    expect(r2.error).not.toBeNull();
    const r3 = await b.client.from("reminders").insert({ patient_id: a.id, title: "x1", starts_at: new Date().toISOString() });
    expect(r3.error).not.toBeNull();
  });

  it("paciente não cria medicamento como se fosse prescrito", async () => {
    const r = await a.client.from("patient_medications").insert({ patient_id: a.id, name: "Falso prescrito", source: "prescription" });
    expect(r.error).not.toBeNull();
  });

  it("funções auxiliares não permitem sondar vínculos alheios", async () => {
    const doctor = await makeVerifiedDoctor("probe-doc");
    await linkDoctorPatient(doctor, a);
    const { data } = await b.client.rpc("has_care_access", { p_doctor: doctor.id, p_patient: a.id });
    expect(data).toBe(false);
  });

  it("funções internas e privilegiadas não são executáveis por usuários", async () => {
    const notify = await b.client.rpc("notify" as never, { p_user: a.id, p_kind: "x", p_title: "spam" } as never);
    expect(notify.error).not.toBeNull();
    const audit = await b.client.rpc("write_audit" as never, { p_action: "fake", p_entity_type: "x", p_entity_id: a.id } as never);
    expect(audit.error).not.toBeNull();
    const fin = await b.client.rpc("finalize_prescription_issue", { p_id: a.id, p_actor: b.id, p_signed_hash: "x", p_provider: "x", p_reference: "x", p_legally_valid: true });
    expect(fin.error).not.toBeNull();
    const metrics = await b.client.rpc("admin_metrics");
    expect(metrics.error).not.toBeNull();
  });
});

describe("acesso médico condicionado a vínculo e verificação", () => {
  it("médico sem vínculo não vê o paciente nem prescreve para ele", async () => {
    const doctor = await makeVerifiedDoctor("nolink");
    const patient = await makePatient("nolink-p");
    expect((await doctor.client.from("patients").select("*").eq("id", patient.id)).data).toHaveLength(0);
    const r = await doctor.client.from("prescriptions").insert({ doctor_id: doctor.id, patient_id: patient.id, valid_until: "2099-01-01" });
    expect(r.error).not.toBeNull();
  });

  it("médico não verificado não prescreve, mesmo com vínculo", async () => {
    const doctor = await makeVerifiedDoctor("unverified");
    const patient = await makePatient("unverified-p");
    await linkDoctorPatient(doctor, patient);
    await service.from("doctors").update({ verification_status: "under_review" }).eq("id", doctor.id);
    const r = await doctor.client.from("prescriptions").insert({ doctor_id: doctor.id, patient_id: patient.id, valid_until: "2099-01-01" });
    expect(r.error).not.toBeNull();
  });

  it("histórico de outros médicos só com consentimento; revogação corta o acesso", async () => {
    const d1 = await makeVerifiedDoctor("hist-d1");
    const d2 = await makeVerifiedDoctor("hist-d2");
    const patient = await makePatient("hist-p");
    await linkDoctorPatient(d1, patient);
    await linkDoctorPatient(d2, patient, false);
    const rx = await issuePrescription(d1, patient.id);
    expect((await d2.client.from("prescriptions").select("id").eq("id", rx.id)).data).toHaveLength(0);

    await patient.client.rpc("update_care_consent", { p_doctor: d2.id, p_share_history: true, p_share_documents: false });
    expect((await d2.client.from("prescriptions").select("id").eq("id", rx.id)).data).toHaveLength(1);

    await patient.client.rpc("revoke_care", { p_counterpart: d2.id });
    expect((await d2.client.from("prescriptions").select("id").eq("id", rx.id)).data).toHaveLength(0);
    expect((await d2.client.from("patients").select("id").eq("id", patient.id)).data).toHaveLength(0);
  });

  it("convite por e-mail não revela se a conta existe", async () => {
    const doctor = await makeVerifiedDoctor("invite");
    const r1 = await doctor.client.rpc("invite_patient", { p_email: "inexistente@nowhere.test" });
    const patient = await makePatient("invited");
    const r2 = await doctor.client.rpc("invite_patient", { p_email: patient.email });
    expect(r1.error).toBeNull();
    expect(r2.error).toBeNull();
    expect(r1.data).toEqual(r2.data);
    const { data: inv } = await patient.client.from("care_invitations").select("id").eq("status", "pending");
    expect(inv?.length).toBe(1);
    const { error } = await patient.client.rpc("respond_invitation", { p_id: inv![0]!.id, p_accept: true, p_share_history: false, p_share_documents: false });
    expect(error).toBeNull();
    expect((await doctor.client.from("patients").select("id").eq("id", patient.id)).data).toHaveLength(1);
  });
});

describe("imutabilidade de prescrições", () => {
  it("prescrição emitida não pode ser editada nem ter itens alterados", async () => {
    const doctor = await makeVerifiedDoctor("immut");
    const patient = await makePatient("immut-p");
    await linkDoctorPatient(doctor, patient);
    const rx = await issuePrescription(doctor, patient.id);

    const upd = await doctor.client.from("prescriptions").update({ general_instructions: "alterado" }).eq("id", rx.id).select("id");
    expect(upd.data ?? []).toHaveLength(0);
    const item = await doctor.client.from("prescription_items").insert({ prescription_id: rx.id, medication_name: "Extra", dosage: "1", frequency: "1x" });
    expect(item.error).not.toBeNull();
    const direct = await service.from("prescriptions").update({ general_instructions: "via service" }).eq("id", rx.id);
    expect(direct.error).not.toBeNull();
  });

  it("paciente não altera dose de medicamento prescrito, apenas lembretes", async () => {
    const doctor = await makeVerifiedDoctor("dose");
    const patient = await makePatient("dose-p");
    await linkDoctorPatient(doctor, patient);
    const rx = await issuePrescription(doctor, patient.id);
    const { data: med } = await patient.client.from("patient_medications").select("*").eq("prescription_id", rx.id).single();
    expect(med?.schedule_times).toEqual(["08:00:00", "20:00:00"]);
    const bad = await patient.client.from("patient_medications").update({ dosage: "3 comprimidos" }).eq("id", med!.id);
    expect(bad.error).not.toBeNull();
    const ok = await patient.client.from("patient_medications").update({ schedule_times: ["09:00", "21:00"] }).eq("id", med!.id);
    expect(ok.error).toBeNull();
  });
});

describe("farmácia", () => {
  it("farmácia não verificada não consulta receitas", async () => {
    const pharmacy = await makeVerifiedPharmacy("pending-ph", false);
    const { error } = await pharmacy.client.rpc("pharmacy_verify_prescription", { p_code: "a".repeat(32) });
    expect(error?.code).toBe("42501");
  });

  it("farmácia não lê prescrições diretamente sem código ou solicitação", async () => {
    const doctor = await makeVerifiedDoctor("ph-direct");
    const patient = await makePatient("ph-direct-p");
    await linkDoctorPatient(doctor, patient);
    const rx = await issuePrescription(doctor, patient.id);
    const pharmacy = await makeVerifiedPharmacy("ph-direct-ph");
    expect((await pharmacy.client.from("prescriptions").select("id").eq("id", rx.id)).data).toHaveLength(0);
  });

  it("consultas de receita são limitadas por minuto", async () => {
    const pharmacy = await makeVerifiedPharmacy("ratelimit");
    let limited = false;
    for (let i = 0; i < 25; i++) {
      const { error } = await pharmacy.client.rpc("pharmacy_verify_prescription", { p_code: "b".repeat(32) });
      if (error?.code === "P0429") {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });
});
