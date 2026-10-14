import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const PASSWORD = "Teste12345!";

export async function login(page: Page, email: string, password = PASSWORD, { expectSuccess = true } = {}) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  if (expectSuccess) await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** Falha em violações sérias ou críticas do axe (WCAG 2.1 A/AA). */
export async function expectAccessible(page: Page) {
  // Sem animações de entrada: o axe avalia o estado final (opacidade 100%).
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

/** Pula o tour de boas-vindas se aparecer. */
export async function dismissTour(page: Page) {
  const skip = page.getByRole("button", { name: "Pular" });
  if (await skip.isVisible({ timeout: 2500 }).catch(() => false)) await skip.click();
}
