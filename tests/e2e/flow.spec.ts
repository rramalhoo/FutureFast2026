import { expect, test } from "@playwright/test";
import { makePatient, makeVerifiedDoctor, makeVerifiedPharmacy } from "../integration/helpers";
import { dismissTour, expectAccessible, login, logout } from "./fixtures";

/**
 * Fluxo principal pela interface: paciente agenda → médico confirma e
 * prescreve → paciente recebe a receita com QR → farmácia verifica e dispensa.
 */
test("fluxo completo médico → paciente → farmácia pela interface", async ({ page }) => {
  test.setTimeout(240_000);
  const doctor = await makeVerifiedDoctor("e2e-doc");
  const patient = await makePatient("e2e-pat");
  const pharmacy = await makeVerifiedPharmacy("e2e-ph");

  // Paciente agenda consulta compartilhando o histórico
  await login(page, patient.email);
  await expect(page).toHaveURL(/\/paciente/);
  await dismissTour(page);
  await page.goto(`/paciente/medicos/${doctor.id}`);
  await page.getByRole("radiogroup", { name: "Horários" }).getByRole("radio").first().click();
  await page.getByLabel("Motivo da consulta (opcional)").fill("Acompanhamento de rotina");
  await page.getByRole("checkbox", { name: /Histórico completo/ }).check();
  await page.getByRole("button", { name: "Solicitar consulta" }).click();
  await expect(page.getByText("Solicitação enviada", { exact: true })).toBeVisible();
  await logout(page);

  // Médico confirma a solicitação
  await login(page, doctor.email);
  await expect(page).toHaveURL(/\/medico/);
  await dismissTour(page);
  await page.goto("/medico/agenda");
  await page.getByRole("button", { name: "Confirmar" }).first().click();
  await expect(page.getByText("Consulta confirmada")).toBeVisible();

  // Médico cria, revisa, assina e emite a prescrição
  await page.goto(`/medico/prescricoes/nova?paciente=${patient.id}`);
  await page.getByRole("combobox", { name: "Medicamento" }).fill("Losartana potássica");
  await page.getByLabel("Dose").fill("1 comprimido");
  await page.getByLabel("Frequência").fill("1 vez ao dia");
  await page.getByLabel("Vezes ao dia").fill("1");
  await page.getByLabel("Duração (dias)").fill("30");
  await page.getByRole("button", { name: "Salvar rascunho e revisar" }).click();
  await expect(page).toHaveURL(/\/medico\/prescricoes\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Revisar e enviar para assinatura" }).click();
  await expect(page.getByText("Hash de integridade (SHA-256) a ser assinado")).toBeVisible();
  await page.getByRole("checkbox", { name: /Revisei paciente/ }).check();
  await page.getByRole("button", { name: "Assinar e emitir" }).click();
  await expect(page.getByText("Sem validade jurídica").first()).toBeVisible();
  await expectAccessible(page);
  await logout(page);

  // Paciente recebe a receita e o medicamento entra no acompanhamento
  await login(page, patient.email);
  await page.goto("/paciente/receitas");
  await page.getByRole("link", { name: /Losartana potássica/ }).click();
  await expect(page.getByRole("img", { name: "QR Code de verificação da receita" })).toBeVisible();
  const code = (await page.getByRole("button", { name: "Copiar código de verificação" }).locator(".font-mono").innerText()).replace(/\s/g, "");
  expect(code).toMatch(/^[0-9a-f]{32}$/);
  await expectAccessible(page);
  await page.goto("/paciente/medicamentos");
  await expect(page.getByRole("heading", { name: "Losartana potássica" })).toBeVisible();
  await logout(page);

  // Farmácia verifica e registra a dispensação
  await login(page, pharmacy.email);
  await dismissTour(page);
  await page.goto("/farmacia/prescricoes");
  await page.getByLabel("Digitar código da receita").fill(code);
  await page.getByRole("button", { name: "Consultar receita" }).click();
  await expect(page.getByText("Integridade conferida")).toBeVisible();
  await expect(page.getByText("Dentro da validade")).toBeVisible();
  await page.getByRole("checkbox", { name: /Realizei a conferência farmacêutica/ }).check();
  await page.getByRole("button", { name: "Registrar dispensação" }).click();
  await expect(page.getByText("Dispensação registrada").first()).toBeVisible();
  await logout(page);

  // Paciente acompanha a dispensação
  await login(page, patient.email);
  await page.goto("/paciente/receitas?filtro=dispensadas");
  await expect(page.getByText("Dispensada", { exact: true })).toBeVisible();
});
