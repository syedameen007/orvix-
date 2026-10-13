import type { Brand, Food, Prisma } from "@orvix/database";
import type { FoodSnapshot, NutrientAmount } from "@orvix/types";

type FoodWithBrand = Food & { brand?: Brand | null };

function asMicros(value: unknown): Record<string, number | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, number | null>;
}

export function foodToSnapshot(food: FoodWithBrand): FoodSnapshot {
  return {
    id: food.id,
    name: food.name,
    brandName: food.brand?.name ?? null,
    state: food.foodState,
    verification: food.verificationState,
    serving: {
      baseQuantity: food.servingQuantity,
      baseUnit: food.servingUnit,
      gramWeight: food.gramWeight,
      mlVolume: food.mlVolume,
      label: `${food.servingQuantity} ${food.servingUnit}`
    },
    nutrientsPerServing: {
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      saturatedFatG: food.saturatedFatG,
      fiberG: food.fiberG,
      sugarG: food.sugarG,
      sodiumMg: food.sodiumMg,
      cholesterolMg: food.cholesterolMg,
      micronutrients: asMicros(food.micronutrients)
    }
  };
}

export function nutrientColumns(nutrients: NutrientAmount) {
  return {
    calories: nutrients.calories ?? null,
    proteinG: nutrients.proteinG ?? null,
    carbsG: nutrients.carbsG ?? null,
    fatG: nutrients.fatG ?? null,
    fiberG: nutrients.fiberG ?? null,
    micronutrients: nutrients.micronutrients ?? {}
  };
}

export function asInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
