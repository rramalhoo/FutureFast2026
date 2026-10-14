import { expect, test } from "@playwright/test";
import { dismissTour, expectAccessible, login, PASSWORD } from "./fixtures";

const MAILPIT = "http://127.0.0.1:54324";

async function confirmationLink(email: string) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const data = (await res.json()) as { messages?: { ID: string }[] };
    if (data.messages?.length) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${data.messages[0]!.ID}`)).json();
      const href = String(msg.HTML).match(/href="([^"]*auth\/confirm[^"]*)"/)?.[1];
      if (href) return href.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("e-mail de confirmação não encontrado");
}

test("cadastro de paciente com confirmação de e-mail, onboarding, conta e logout", async ({ page }) => {
  const email = `e2e.paciente.${Date.now()}@test.genvity.local`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome completo").fill("Paciente Teste E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar senha").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/verifique-email/);

  // Login antes da confirmação é bloqueado
  await login(page, email, PASSWORD, { expectSuccess: false });
  await expect(page.getByText("Confirme seu e-mail")).toBeVisible();

  await page.goto(await confirmationLink(email));
  await expect(page).toHaveURL(/onboarding/);
  await expectAccessible(page);
  await page.getByLabel("Data de nascimento").fill("1958-03-20");
  await page.getByLabel("Celular com DDD").fill("11987654321");
  await page.getByLabel("Cidade").fill("Campinas");
  await page.getByLabel("Estado").selectOption("SP");
  await page.getByLabel("CPF (opcional)").fill("123");
  await page.getByRole("button", { name: "Concluir cadastro" }).click();
  await expect(page.getByText("CPF inválido.")).toBeVisible();
  await page.getByLabel("CPF (opcional)").fill("");
  await page.getByRole("button", { name: "Concluir cadastro" }).click();
  await expect(page).toHaveURL(/\/paciente/);
  await dismissTour(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Paciente");
  await expectAccessible(page);

  // Médico não acessa área de paciente e vice-versa
  await page.goto("/medico");
  await expect(page).toHaveURL(/\/paciente$/);

  // Preferências de acessibilidade persistem
  await page.goto("/conta?tab=preferencias");
  await page.getByRole("radio", { name: "Muito grande" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-font-scale", "xl");

  await page.getByRole("button", { name: "Menu da conta" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await expect(page).toHaveURL(/login\?saiu=1/);
});

test("recuperação de senha responde de forma neutra", async ({ page }) => {
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail da conta").fill("inexistente@test.genvity.local");
  await page.getByRole("button", { name: "Enviar link de redefinição" }).click();
  await expect(page.getByText("Se houver uma conta com este e-mail")).toBeVisible();
});
