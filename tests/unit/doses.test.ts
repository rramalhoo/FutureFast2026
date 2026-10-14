import { describe, expect, it } from "vitest";
import { adherence, dosesForDay, isActiveOn, nextDose, type MedicationForSchedule } from "@/lib/doses";
import { zonedDateTime } from "@/lib/format";

const med = (over: Partial<MedicationForSchedule> = {}): MedicationForSchedule => ({
  id: "m1",
  name: "Medicamento A",
  dosage: "1 comprimido",
  schedule_times: ["08:00:00", "20:00:00"],
  start_date: "2026-10-01",
  end_date: "2026-10-20",
  status: "active",
  ...over,
});

describe("agenda de doses", () => {
  it("respeita início, fim e status do tratamento", () => {
    expect(isActiveOn(med(), "2026-09-30")).toBe(false);
    expect(isActiveOn(med(), "2026-10-10")).toBe(true);
    expect(isActiveOn(med(), "2026-10-21")).toBe(false);
    expect(isActiveOn(med({ status: "paused" }), "2026-10-10")).toBe(false);
    expect(isActiveOn(med({ end_date: null }), "2027-01-01")).toBe(true);
  });

  it("gera horários no fuso de Brasília e combina com registros", () => {
    const now = zonedDateTime("2026-10-10", "12:00");
    const logs = [{ patient_medication_id: "m1", scheduled_for: zonedDateTime("2026-10-10", "08:00").toISOString(), status: "taken" as const }];
    const doses = dosesForDay([med()], logs, "2026-10-10", now);
    expect(doses.map((d) => d.time)).toEqual(["08:00", "20:00"]);
    expect(doses[0]!.scheduledFor).toBe("2026-10-10T11:00:00.000Z");
    expect(doses[0]!.status).toBe("taken");
    expect(doses[1]!.status).toBe("pending");
  });

  it("marca doses antigas sem registro como 'sem registro' e calcula adesão", () => {
    const now = zonedDateTime("2026-10-10", "23:30");
    const doses = dosesForDay([med({ schedule_times: ["08:00"] })], [], "2026-10-10", now);
    expect(doses[0]!.status).toBe("missed");
    expect(adherence(doses)).toMatchObject({ total: 1, taken: 0, percent: 0 });
  });

  it("próxima dose é a primeira pendente a partir de agora", () => {
    const now = zonedDateTime("2026-10-10", "09:00");
    const doses = dosesForDay([med()], [], "2026-10-10", now);
    expect(nextDose(doses, now)?.time).toBe("20:00");
  });
});
