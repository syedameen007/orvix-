import { describe, expect, it } from "vitest";
import { changePasswordSchema, onboardingSchema, registerSchema, waterEntrySchema } from "../packages/validation/src/index.js";

describe("password policy", () => {
  const base = { email: "a@b.co", name: "Alex" };

  it("rejects short or weak passwords with a helpful message", () => {
    expect(registerSchema.safeParse({ ...base, password: "short1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "onlyletterslong" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "1234567890123" }).success).toBe(false);
  });

  it("accepts a 10+ character password with a letter and a number", () => {
    expect(registerSchema.safeParse({ ...base, password: "strongpass42" }).success).toBe(true);
  });

  it("applies the same rule when changing a password", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "weak" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "betterpass99" }).success).toBe(true);
  });
});

describe("onboarding and water input", () => {
  it("rejects implausible body measurements", () => {
    const valid = { name: "A", goal: "MAINTAIN", sex: "MALE", age: 30, heightCm: 175, weightKg: 70, activityLevel: "LIGHT" };
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...valid, heightCm: 20 }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, age: 9 }).success).toBe(false);
  });

  it("caps a single water entry", () => {
    expect(waterEntrySchema.safeParse({ amountMl: 250 }).success).toBe(true);
    expect(waterEntrySchema.safeParse({ amountMl: 99999 }).success).toBe(false);
    expect(waterEntrySchema.safeParse({ amountMl: 250, date: "12/10/2026" }).success).toBe(false);
  });
});
