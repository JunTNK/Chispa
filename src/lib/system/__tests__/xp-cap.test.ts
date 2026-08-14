import { describe, expect, it } from "vitest";
import { applyDailyCap, DAILY_XP_CAP } from "../xp";

describe("XP cap diario (rúbrica §7)", () => {
  it("aplica el tope diario de XP", () => {
    expect(applyDailyCap(100, 0).awarded).toBe(100);
    expect(applyDailyCap(100, 100).awarded).toBe(DAILY_XP_CAP - 100); // restante del día
    expect(applyDailyCap(100, DAILY_XP_CAP).awarded).toBe(0); // ya tocó el tope
  });

  it("marca capped cuando toca el tope", () => {
    expect(applyDailyCap(200, 0).capped).toBe(true);
    expect(applyDailyCap(100, 0).capped).toBe(false);
    expect(applyDailyCap(50, DAILY_XP_CAP).capped).toBe(true);
  });

  it("reporta el restante del día", () => {
    const r = applyDailyCap(60, 40);
    expect(r.remaining).toBe(DAILY_XP_CAP - 40 - 60);
    expect(r.awarded).toBe(60);
    expect(applyDailyCap(0, DAILY_XP_CAP).remaining).toBe(0);
  });
});
