import { describe, expect, it } from "vitest";
import { addDaysISO, calendarRange, fmt, localDateISO, shiftCalendar, weekdayOf, zonedDateTime } from "@/lib/format";
import { digits, firstName, haversineKm, initials, safeInternalPath } from "@/lib/utils";
import { PRESCRIPTION_STATUS, APPOINTMENT_STATUS, PHARMACY_REQUEST_STATUS } from "@/lib/labels";

describe("datas", () => {
  it("converte horário local de Brasília para UTC", () => {
    expect(zonedDateTime("2026-10-14", "08:30").toISOString()).toBe("2026-10-14T11:30:00.000Z");
    expect(localDateISO("2026-10-15T02:00:00Z")).toBe("2026-10-14");
  });
  it("calcula intervalos do calendário", () => {
    expect(weekdayOf("2026-10-14")).toBe(3);
    expect(calendarRange("week", "2026-10-14")).toEqual({ from: "2026-10-11", to: "2026-10-17" });
    expect(calendarRange("month", "2026-10-14").from).toBe("2026-09-27");
    expect(shiftCalendar("month", "2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("formata moeda, CPF e idade", () => {
    expect(fmt.currency(7900).replace(/\s/g, " ")).toBe("R$ 79,00");
    expect(fmt.cpf("52998224725")).toBe("529.982.247-25");
    expect(fmt.age("2000-01-01")).toBeGreaterThanOrEqual(25);
  });
});

describe("utilitários", () => {
  it("bloqueia redirecionamentos externos (open redirect)", () => {
    expect(safeInternalPath("/paciente")).toBe("/paciente");
    expect(safeInternalPath("//evil.com")).toBe("/");
    expect(safeInternalPath("https://evil.com")).toBe("/");
    expect(safeInternalPath("/\\evil.com")).toBe("/");
  });
  it("funções auxiliares", () => {
    expect(initials("Maria da Silva")).toBe("MS");
    expect(firstName("Dra. Helena Souza")).toBe("Helena");
    expect(digits("(11) 9-1234")).toBe("1191234");
    expect(Math.round(haversineKm({ lat: -23.5505, lng: -46.6333 }, { lat: -22.9068, lng: -43.1729 }))).toBe(361);
  });
  it("todos os status possuem rótulo", () => {
    for (const map of [PRESCRIPTION_STATUS, APPOINTMENT_STATUS, PHARMACY_REQUEST_STATUS]) {
      for (const v of Object.values(map)) expect(v.label.length).toBeGreaterThan(2);
    }
  });
});
