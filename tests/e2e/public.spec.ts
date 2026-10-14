import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll } from "./fixtures";

test.describe("páginas públicas", () => {
  test("landing apresenta o produto, os três ambientes, planos e FAQ", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("um só cuidado");
    await expect(page.getByRole("heading", { name: "Cada pessoa vê exatamente o que precisa." })).toBeVisible();
    for (const env of ["Pacientes", "Médicos", "Farmácias"]) await expect(page.locator("#ambientes").getByRole("heading", { name: env, exact: true })).toBeVisible();
    await expect(page.getByText("Genvity Pro").first()).toBeVisible();
    await page.getByRole("button", { name: "Quem pode ver meus dados de saúde?" }).click();
    await expect(page.getByText("Somente você e os profissionais que você autorizar")).toBeVisible();
    await expectAccessible(page);
  });

  test("navegação entre páginas institucionais", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Principal" });
    for (const [label, heading] of [
      ["Funcionalidades", "Tudo o que o cuidado precisa"],
      ["Pacientes", "Seu tratamento"],
      ["Médicos", "Menos burocracia"],
      ["Farmácias", "Atendimento ágil"],
      ["Planos", "Planos para cada etapa"],
      ["Sobre", "Cuidado contínuo"],
    ] as const) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    }
  });

  for (const path of ["/login", "/cadastro", "/planos", "/recuperar-senha", "/privacidade"]) {
    test(`acessibilidade e responsividade de ${path}`, async ({ page }) => {
      await page.goto(path);
      await expectAccessible(page);
      await page.setViewportSize({ width: 375, height: 800 });
      await expectNoHorizontalScroll(page);
    });
  }

  test("áreas privadas exigem login e preservam o destino", async ({ page }) => {
    await page.goto("/medico/prescricoes");
    await expect(page).toHaveURL(/\/login\?next=%2Fmedico%2Fprescricoes/);
  });

  test("link de verificação de receita não expõe dados sem login de farmácia", async ({ page }) => {
    await page.goto(`/verificar/${"a".repeat(32)}`);
    await expect(page.getByRole("heading", { name: "Receita digital protegida" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Entrar como farmácia" })).toBeVisible();
  });

  test("formulário de login mostra erro genérico para credenciais inválidas", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("ninguem@exemplo.com");
    await page.getByLabel("Senha", { exact: true }).fill("errada123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  });

  test("cadastro valida campos no servidor", async ({ page }) => {
    await page.goto("/cadastro");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Revise os campos destacados.")).toBeVisible();
    await expect(page.getByText("Informe seu nome completo.")).toBeVisible();
  });
});
