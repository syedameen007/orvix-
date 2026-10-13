export type Goal = "LOSE_FAT" | "BUILD_MUSCLE" | "MAINTAIN" | "GET_FITTER";
export type Sex = "MALE" | "FEMALE" | "OTHER";
export type ActivityLevel = "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE";

export interface TargetInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface DailyTargets {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
}

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  LOSE_FAT: -0.18,
  BUILD_MUSCLE: 0.1,
  MAINTAIN: 0,
  GET_FITTER: -0.05
};

/** Mifflin-St Jeor basal metabolic rate. "OTHER" uses the average of both formulas. */
export function calculateBmr({ sex, age, heightCm, weightKg }: Pick<TargetInput, "sex" | "age" | "heightCm" | "weightKg">): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "MALE") return base + 5;
  if (sex === "FEMALE") return base - 161;
  return base - 78;
}

/**
 * Deterministic daily targets. Calories never drop below a safe floor, and protein
 * is set per kg of body weight so beginners get sensible numbers without any maths.
 */
export function calculateDailyTargets(input: TargetInput): DailyTargets {
  const bmr = calculateBmr(input);
  const tdee = bmr * ACTIVITY_MULTIPLIER[input.activityLevel];
  const floor = input.sex === "MALE" ? 1500 : 1200;
  const calories = Math.max(floor, Math.round((tdee * (1 + GOAL_ADJUSTMENT[input.goal])) / 10) * 10);

  const proteinPerKg = input.goal === "BUILD_MUSCLE" ? 2 : input.goal === "LOSE_FAT" ? 1.8 : 1.4;
  const proteinG = Math.round(input.weightKg * proteinPerKg);
  const fatG = Math.round((calories * 0.27) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG: Math.round((calories / 1000) * 14),
    waterMl: Math.round((input.weightKg * 33) / 50) * 50
  };
}
