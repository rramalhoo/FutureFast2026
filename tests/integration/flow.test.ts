import { describe, expect, it } from "vitest";
import { linkDoctorPatient, makePatient, makeVerifiedDoctor, makeVerifiedPharmacy, service } from "./helpers";

/**
 * Fluxo principal: médico → paciente → farmácia, executado com as mesmas
 * funções que a aplicação usa, sob RLS com cada usuário autenticado.
 */
describe("fluxo completo médico → paciente → farmácia", () => {
  it("emite, recebe, solicita, verifica e dispensa com auditoria e notificações", async () => {
    const doctor = await makeVerifiedDoctor("flow-doc");
    const patient = await makePatient("flow-pat");
    const pharmacy = await makeVerifiedPharmacy("flow-ph");

    // 1–3. Vínculo via consulta e registro do atendimento
    const apptId = await linkDoctorPatient(doctor, patient);
    const { error: consultErr } = await doctor.client.from("consultations").insert({
      doctor_id: doctor.id,
      patient_id: patient.id,
      appointment_id: apptId,
      summary_for_patient: "Resumo para o paciente.",
    });
    expect(consultErr).toBeNull();

    // 4. Rascunho → aguardando assinatura
    const { data: rx } = await doctor.client
      .from("prescriptions")
      .insert({ doctor_id: doctor.id, patient_id: patient.id, kind: "simple", valid_until: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10) })
      .select("id")
      .single();
    await doctor.client.from("prescription_items").insert({ prescription_id: rx!.id, medication_name: "Medicamento de teste", dosage: "1 comprimido", frequency: "1x ao dia", times_per_day: 1, duration_days: 10 });
    // Paciente não vê rascunhos
    expect((await patient.client.from("prescriptions").select("id").eq("id", rx!.id)).data).toHaveLength(0);
    const { data: hash } = await doctor.client.rpc("submit_prescription", { p_id: rx!.id });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    // Hash adulterado é rejeitado na finalização
    const tampered = await service.rpc("finalize_prescription_issue", { p_id: rx!.id, p_actor: doctor.id, p_signed_hash: "0".repeat(64), p_provider: "dev-unsigned", p_reference: "t", p_legally_valid: false });
    expect(tampered.error).not.toBeNull();
    // Somente o autor emite
    const wrongActor = await service.rpc("finalize_prescription_issue", { p_id: rx!.id, p_actor: patient.id, p_signed_hash: hash!, p_provider: "dev-unsigned", p_reference: "t", p_legally_valid: false });
    expect(wrongActor.error).not.toBeNull();

    // 5. Assinatura (servidor) e emissão
    const { data: code, error: issueErr } = await service.rpc("finalize_prescription_issue", { p_id: rx!.id, p_actor: doctor.id, p_signed_hash: hash!, p_provider: "dev-unsigned", p_reference: "t", p_legally_valid: false });
    expect(issueErr).toBeNull();
    expect(code).toMatch(/^[0-9a-f]{32}$/);

    // 6–8. Paciente recebe receita, medicamentos e notificação
    const { data: patientRx } = await patient.client.from("prescriptions").select("status").eq("id", rx!.id).single();
    expect(patientRx?.status).toBe("issued");
    const { data: meds } = await patient.client.from("patient_medications").select("schedule_times, end_date, source").eq("prescription_id", rx!.id);
    expect(meds).toHaveLength(1);
    expect(meds![0]!.source).toBe("prescription");
    expect(meds![0]!.schedule_times).toEqual(["08:00:00"]);
    const { data: notes } = await patient.client.from("notifications").select("kind, title");
    expect(notes?.some((n) => n.kind === "prescription")).toBe(true);

    // Paciente registra dose (não altera a prescrição)
    const { data: medRow } = await patient.client.from("patient_medications").select("id").eq("prescription_id", rx!.id).single();
    const { error: doseErr } = await patient.client.from("dose_logs").insert({ patient_id: patient.id, patient_medication_id: medRow!.id, scheduled_for: new Date().toISOString(), status: "taken" });
    expect(doseErr).toBeNull();

    // 9. Busca de farmácias e solicitação com receita
    const { data: found } = await patient.client.rpc("search_pharmacies", { p_query: "", p_lat: -23.56, p_lng: -46.65, p_radius_km: 10 });
    expect(found?.some((f) => f.id === pharmacy.pharmacyId)).toBe(true);
    const { data: reqId, error: reqErr } = await patient.client.rpc("create_pharmacy_request", { p_pharmacy: pharmacy.pharmacyId, p_prescription: rx!.id, p_items_description: "Medicamento de teste", p_note: "" });
    expect(reqErr).toBeNull();
    // Com a solicitação, a farmácia passa a ver a receita anexada
    expect((await pharmacy.client.from("prescriptions").select("id").eq("id", rx!.id)).data).toHaveLength(1);

    // 10–11. Verificação por código e dispensação
    const { data: verified } = await pharmacy.client.rpc("pharmacy_verify_prescription", { p_code: code! });
    const v = verified as { found: boolean; integrity_ok: boolean; status: string; patient: { name: string }; items: unknown[] };
    expect(v.found).toBe(true);
    expect(v.integrity_ok).toBe(true);
    expect(v.status).toBe("issued");
    expect(v.items).toHaveLength(1);

    const { error: dispErr } = await pharmacy.client.rpc("pharmacy_dispense", { p_code: code!, p_pharmacist_name: "RT Teste", p_pharmacist_crf: "CRF-SP 1", p_notes: "", p_request: reqId! });
    expect(dispErr).toBeNull();
    // Não dispensa duas vezes
    const again = await pharmacy.client.rpc("pharmacy_dispense", { p_code: code!, p_pharmacist_name: "RT Teste", p_pharmacist_crf: "CRF-SP 1", p_notes: "", p_request: reqId! });
    expect(again.error).not.toBeNull();

    // 12. Paciente acompanha: status, solicitação concluída e trilha de acessos
    expect((await patient.client.from("prescriptions").select("status").eq("id", rx!.id).single()).data?.status).toBe("dispensed");
    expect((await patient.client.from("pharmacy_requests").select("status").eq("id", reqId!).single()).data?.status).toBe("completed");
    const { data: audit } = await patient.client.from("audit_logs").select("action").eq("entity_id", rx!.id);
    const actions = (audit ?? []).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["prescription.issued", "prescription.viewed_by_pharmacy", "prescription.dispensed"]));

    // Médico vê a dispensação da própria receita
    expect((await doctor.client.from("dispensations").select("id").eq("prescription_id", rx!.id)).data).toHaveLength(1);
  });

  it("cancelamento pelo médico descontinua o acompanhamento e bloqueia a farmácia", async () => {
    const doctor = await makeVerifiedDoctor("cancel-doc");
    const patient = await makePatient("cancel-pat");
    const pharmacy = await makeVerifiedPharmacy("cancel-ph");
    await linkDoctorPatient(doctor, patient);
    const { issuePrescription } = await import("./helpers");
    const rx = await issuePrescription(doctor, patient.id);
    const { error } = await doctor.client.rpc("cancel_prescription", { p_id: rx.id, p_reason: "Erro de digitação na dose" });
    expect(error).toBeNull();
    const { data: med } = await patient.client.from("patient_medications").select("status").eq("prescription_id", rx.id).single();
    expect(med?.status).toBe("discontinued");
    const disp = await pharmacy.client.rpc("pharmacy_dispense", { p_code: rx.code, p_pharmacist_name: "RT", p_pharmacist_crf: "CRF 1", p_notes: "", p_request: null as unknown as string });
    expect(disp.error).not.toBeNull();
  });

  it("agenda impede dupla marcação do mesmo horário", async () => {
    const doctor = await makeVerifiedDoctor("double-doc");
    const p1 = await makePatient("double-1");
    const p2 = await makePatient("double-2");
    const { data: slots } = await p1.client.rpc("get_available_slots", { p_doctor: doctor.id, p_from: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), p_days: 1 });
    const slot = slots![0]!;
    const r1 = await p1.client.rpc("request_appointment", { p_doctor: doctor.id, p_starts_at: slot.starts_at, p_modality: slot.modality, p_reason: "", p_share_history: false, p_share_documents: false });
    expect(r1.error).toBeNull();
    const r2 = await p2.client.rpc("request_appointment", { p_doctor: doctor.id, p_starts_at: slot.starts_at, p_modality: slot.modality, p_reason: "", p_share_history: false, p_share_documents: false });
    expect(r2.error).not.toBeNull();
  });

  it("mensagens só entre participantes de vínculo ativo", async () => {
    const doctor = await makeVerifiedDoctor("msg-doc");
    const patient = await makePatient("msg-pat");
    const outsider = await makePatient("msg-out");
    await linkDoctorPatient(doctor, patient);
    const { data: convId, error } = await patient.client.rpc("start_conversation", { p_counterpart: doctor.id });
    expect(error).toBeNull();
    expect((await patient.client.from("messages").insert({ conversation_id: convId!, sender_id: patient.id, body: "Olá" })).error).toBeNull();
    expect((await outsider.client.from("messages").insert({ conversation_id: convId!, sender_id: outsider.id, body: "Intruso" })).error).not.toBeNull();
    expect((await outsider.client.from("messages").select("id").eq("conversation_id", convId!)).data).toHaveLength(0);
    expect((await doctor.client.from("messages").select("body").eq("conversation_id", convId!)).data).toHaveLength(1);
  });

  it("documentos médicos ficam privados no storage", async () => {
    const owner = await makePatient("doc-owner");
    const other = await makePatient("doc-other");
    const path = `${owner.id}/teste.pdf`;
    const up = await owner.client.storage.from("medical-documents").upload(path, new Blob(["%PDF-1.4 teste"], { type: "application/pdf" }), { contentType: "application/pdf" });
    expect(up.error).toBeNull();
    await owner.client.from("documents").insert({ patient_id: owner.id, uploaded_by: owner.id, title: "Exame", storage_path: path, mime_type: "application/pdf", size_bytes: 14 });
    const ownUrl = await owner.client.storage.from("medical-documents").createSignedUrl(path, 60);
    expect(ownUrl.error).toBeNull();
    const otherUrl = await other.client.storage.from("medical-documents").createSignedUrl(path, 60);
    expect(otherUrl.data?.signedUrl).toBeFalsy();
    const otherUpload = await other.client.storage.from("medical-documents").upload(`${owner.id}/invasao.pdf`, new Blob(["x"], { type: "application/pdf" }), { contentType: "application/pdf" });
    expect(otherUpload.error).not.toBeNull();
  });

  it("exportação LGPD retorna apenas os dados do titular", async () => {
    const p = await makePatient("export");
    const { data, error } = await p.client.rpc("export_my_data");
    expect(error).toBeNull();
    const exp = data as { profile: { id: string }; prescriptions: unknown[] };
    expect(exp.profile.id).toBe(p.id);
  });
});
