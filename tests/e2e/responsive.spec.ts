import { expect, test } from "@playwright/test";
import { makePatient } from "../integration/helpers";
import { dismissTour, expectNoHorizontalScroll, login } from "./fixtures";

test("landing e painel do paciente no celular", async ({ page }) => {
  await page.goto("/");
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("navigation", { name: "Principal (celular)" })).toBeVisible();
  await page.keyboard.press("Escape");

  const patient = await makePatient("mobile");
  await login(page, patient.email);
  await expect(page).toHaveURL(/\/paciente/);
  await dismissTour(page);
  await expect(page.getByRole("navigation", { name: "Navegação rápida" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  for (const path of ["/paciente/medicamentos", "/paciente/calendario", "/paciente/receitas", "/paciente/farmacias", "/conta"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
  await page.getByRole("navigation", { name: "Navegação rápida" }).getByRole("link", { name: "Calendário" }).click();
  await expect(page).toHaveURL(/calendario/);
});
