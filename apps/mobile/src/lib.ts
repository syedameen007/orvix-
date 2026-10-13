import { useCallback, useEffect, useState } from "react";

export type View = "today" | "eat" | "train" | "progress" | "coach" | "profile";

export interface Profile {
  name?: string | null;
  sex?: string | null;
  age?: number | null;
  heightCm?: number | null;
  currentWeightKg?: number | null;
  startingWeightKg?: number | null;
  targetWeightKg?: number | null;
  primaryGoal?: string | null;
  activityLevel?: string | null;
  calorieTarget?: number | null;
  proteinTargetG?: number | null;
  carbTargetG?: number | null;
  fatTargetG?: number | null;
  waterTargetMl?: number | null;
  onboardingCompleted?: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  profile?: { name?: string | null } | null;
}

export interface Macros {
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  waterMl?: number | null;
}

export interface FoodResult {
  id: string;
  name: string;
  brandName?: string | null;
  serving: { baseQuantity: number; baseUnit: string; label?: string | null; gramWeight?: number | null; mlVolume?: number | null };
  nutrientsPerServing: Macros;
}

export interface ExerciseResult {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: string[];
}

export interface DailyMeal {
  id: string;
  mealType: string;
  customName?: string | null;
  calories?: number | null;
  items: Array<{ id: string; quantity: number; unit: string; foodSnapshot?: { name?: string } | null }>;
}

export interface DailyResponse {
  targets: Macros;
  total: Macros;
  meals: DailyMeal[];
}

export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
export const UNITS = ["g", "kg", "ml", "L", "serving", "piece", "egg", "chapati", "slice", "cup", "bowl", "tbsp", "tsp"];

type Serving = FoodResult["serving"];
const MASS: Record<string, number> = { g: 1, kg: 1000 };
const VOLUME: Record<string, number> = { ml: 1, L: 1000 };

/**
 * How many "base servings" a quantity of `unit` represents. Mirrors the server's calculateScale,
 * returning null when the conversion isn't possible (so the UI never offers a unit that would fail on save).
 */
export function foodScale(serving: Serving, quantity: number, unit: string): number | null {
  if (!(serving.baseQuantity > 0)) return null;
  if (unit === serving.baseUnit) return quantity / serving.baseQuantity;
  if (unit in MASS) {
    const base = serving.baseUnit in MASS ? serving.baseQuantity * MASS[serving.baseUnit]! : (serving.gramWeight ?? null);
    if (base && base > 0) return (quantity * MASS[unit]!) / base;
  }
  if (unit in VOLUME) {
    const base = serving.baseUnit in VOLUME ? serving.baseQuantity * VOLUME[serving.baseUnit]! : (serving.mlVolume ?? null);
    if (base && base > 0) return (quantity * VOLUME[unit]!) / base;
  }
  if (unit === "serving") return quantity;
  return null;
}

/** Units this particular food can actually be measured in. */
export function unitOptions(serving: Serving): string[] {
  return [serving.baseUnit, "g", "kg", "ml", "L", "serving"].filter((unit, index, all) => all.indexOf(unit) === index && foodScale(serving, 1, unit) !== null);
}

export const mealLabel = (type: string) => type.charAt(0) + type.slice(1).toLowerCase();

export function formatNumber(value?: number | null, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

/** Local calendar day as YYYY-MM-DD (toISOString would shift the day for users east/west of UTC). */
export function todayISO(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function defaultMealType() {
  const hour = new Date().getHours();
  if (hour < 11) return "BREAKFAST";
  if (hour < 16) return "LUNCH";
  if (hour < 21) return "DINNER";
  return "SNACK";
}

export function useStoredToken() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("orvix-token"));
  const save = useCallback((next: string | null) => {
    if (next) localStorage.setItem("orvix-token", next);
    else localStorage.removeItem("orvix-token");
    setToken(next);
  }, []);
  return [token, save] as const;
}

export function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again.") {
  return err instanceof Error && err.message ? err.message : fallback;
}
