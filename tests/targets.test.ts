import { describe, expect, it } from "vitest";
import { calculateBmr, calculateDailyTargets } from "../packages/utils/src/targets.js";

describe("daily target calculator", () => {
  it("matches Mifflin-St Jeor for a known male profile", () => {
    expect(Math.round(calculateBmr({ sex: "MALE", age: 30, heightCm: 180, weightKg: 80 }))).toBe(1780);
  });

  it("creates a deficit for fat loss and a surplus for muscle gain", () => {
    const base = { sex: "FEMALE", age: 28, heightCm: 165, weightKg: 65, activityLevel: "MODERATE" } as const;
    const lose = calculateDailyTargets({ ...base, goal: "LOSE_FAT" });
    const gain = calculateDailyTargets({ ...base, goal: "BUILD_MUSCLE" });
    expect(lose.calories).toBeLessThan(lose.tdee);
    expect(gain.calories).toBeGreaterThan(gain.tdee);
  });

  it("never drops below a safe calorie floor", () => {
    const targets = calculateDailyTargets({ sex: "FEMALE", age: 60, heightCm: 150, weightKg: 45, activityLevel: "SEDENTARY", goal: "LOSE_FAT" });
    expect(targets.calories).toBeGreaterThanOrEqual(1200);
  });

  it("keeps macro calories close to the calorie target", () => {
    const t = calculateDailyTargets({ sex: "MALE", age: 25, heightCm: 175, weightKg: 70, activityLevel: "LIGHT", goal: "MAINTAIN" });
    const macroCalories = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    expect(Math.abs(macroCalories - t.calories)).toBeLessThan(20);
  });
});
