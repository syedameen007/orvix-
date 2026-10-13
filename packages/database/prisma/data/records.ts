import { readFileSync } from "node:fs";
import { REFERENCE_FOODS } from "./foods.js";

export const FOOD_SOURCE = {
  name: "ORVIX Reference Foods v1",
  sourceType: "REFERENCE",
  license: "ORVIX curated reference values (approximate)",
  sourceReference:
    "Typical rounded values consistent with USDA FoodData Central (public domain) and ICMR-NIN Indian Food Composition Tables 2017; recipe dishes are typical home-cooked estimates.",
  verificationStatus: "UNVERIFIED" as const,
  notes: "Approximate values for everyday tracking, not laboratory data. Prefer the pack label for packaged products."
};

export const FOOD_NOTE = "Approximate reference value. Check the pack label for packaged products.";

export const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function buildFoodRecords(sourceId: string) {
  return REFERENCE_FOODS.map((food) => ({
    ownerId: null,
    brandId: null,
    sourceId,
    name: food.name,
    normalizedName: normalizeName(food.name),
    aliases: food.aliases,
    category: food.category,
    foodState: food.state,
    verificationState: "UNVERIFIED" as const,
    lifecycle: "PUBLISHED" as const,
    servingQuantity: food.quantity,
    servingUnit: food.unit,
    gramWeight: food.gramWeight ?? null,
    mlVolume: food.mlVolume ?? null,
    calories: food.calories,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    fiberG: food.fiberG,
    popularity: food.popularity,
    notes: FOOD_NOTE
  }));
}

interface ExerciseSource {
  name: string;
  normalizedName: string;
  aliases: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  movementPattern: string | null;
  difficulty: string;
  instructions: string;
  mediaUrl: string | null;
}

export function buildExerciseRecords() {
  const raw = JSON.parse(readFileSync(new URL("./exercises.json", import.meta.url), "utf8")) as ExerciseSource[];
  return raw.map((exercise) => ({
    ownerId: null,
    name: exercise.name,
    normalizedName: exercise.normalizedName,
    aliases: exercise.aliases,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    equipment: exercise.equipment,
    movementPattern: exercise.movementPattern,
    difficulty: exercise.difficulty,
    instructions: exercise.instructions,
    mediaUrl: exercise.mediaUrl,
    lifecycle: "PUBLISHED" as const
  }));
}
