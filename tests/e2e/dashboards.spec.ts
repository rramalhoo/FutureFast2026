import { expect, test } from "@playwright/test";
import { createUser, makePatient, makeVerifiedDoctor, makeVerifiedPharmacy, service } from "../integration/helpers";
import { dismissTour, expectAccessible, login } from "./fixtures";

test("navegação e acessibilidade dos painéis de cada perfil", async ({ page }) => {
  test.setTimeout(180_000);
  const patient = await makePatient("nav-pat");
  const doctor = await makeVerifiedDoctor("nav-doc");
  const pharmacy = await makeVerifiedPharmacy("nav-ph");
  const admin = await createUser("nav-admin", "patient");
  await service.from("profiles").update({ role: "admin", onboarding_completed: true }).eq("id", admin.id);

  const plan: [string, string[]][] = [
    [patient.email, ["/paciente", "/paciente/medicamentos", "/paciente/calendario?view=week", "/paciente/historico", "/paciente/medicos", "/paciente/farmacias", "/paciente/mensagens", "/paciente/leitor", "/ajuda", "/notificacoes"]],
    [doctor.email, ["/medico", "/medico/agenda", "/medico/pacientes", "/medico/consultas", "/medico/prescricoes", "/medico/mensagens", "/medico/assistente", "/medico/perfil"]],
    [pharmacy.email, ["/farmacia", "/farmacia/leitor", "/farmacia/prescricoes", "/farmacia/estoque", "/farmacia/solicitacoes", "/farmacia/configuracoes"]],
    [admin.email, ["/admin", "/admin/usuarios", "/admin/verificacoes", "/admin/assinaturas", "/admin/relatorios", "/admin/auditoria", "/admin/suporte", "/admin/configuracoes"]],
  ];

  for (const [email, paths] of plan) {
    await page.context().clearCookies();
    await login(page, email);
    await page.waitForURL(/\/(paciente|medico|farmacia|admin)/);
    await dismissTour(page);
    for (const path of paths) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
      await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
      await expect(page.getByText("Algo não saiu como esperado")).toHaveCount(0);
    }
    await page.goto(paths[0]!);
    await expectAccessible(page);
  }
});

test("pesquisa global (Ctrl+K) navega para páginas", async ({ page }) => {
  const patient = await makePatient("cmdk");
  await login(page, patient.email);
  await page.waitForURL(/\/paciente/);
  await dismissTour(page);
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Pesquise páginas, pacientes, receitas…").fill("Histórico");
  await page.getByRole("option", { name: "Histórico" }).click();
  await expect(page).toHaveURL(/\/paciente\/historico/);
});
