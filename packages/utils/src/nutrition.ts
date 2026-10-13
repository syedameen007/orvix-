import type {
  CalculatedMealItem,
  FoodSnapshot,
  MealCalculation,
  MealItemInput,
  NutrientAmount,
  ServingDefinition,
  Unit
} from "@orvix/types";

const massToGrams: Partial<Record<Unit, number>> = {
  mg: 0.001,
  g: 1,
  kg: 1000
};

const volumeToMl: Partial<Record<Unit, number>> = {
  ml: 1,
  L: 1000
};

const directCountUnits: Unit[] = [
  "piece",
  "egg",
  "chapati",
  "slice",
  "serving",
  "cup",
  "bowl",
  "plate",
  "tbsp",
  "tsp",
  "custom"
];

export function isMassUnit(unit: Unit): boolean {
  return massToGrams[unit] !== undefined;
}

export function isVolumeUnit(unit: Unit): boolean {
  return volumeToMl[unit] !== undefined;
}

export function toBaseMass(quantity: number, unit: Unit): number | null {
  const multiplier = massToGrams[unit];
  return multiplier === undefined ? null : quantity * multiplier;
}

export function toBaseVolume(quantity: number, unit: Unit): number | null {
  const multiplier = volumeToMl[unit];
  return multiplier === undefined ? null : quantity * multiplier;
}

function assertUsableQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive finite number.");
  }
}

function convertServingToKnownBase(serving: ServingDefinition): number | null {
  if (isMassUnit(serving.baseUnit)) {
    return toBaseMass(serving.baseQuantity, serving.baseUnit);
  }
  if (isVolumeUnit(serving.baseUnit)) {
    return toBaseVolume(serving.baseQuantity, serving.baseUnit);
  }
  return null;
}

export function calculateScale(serving: ServingDefinition, quantity: number, unit: Unit): number {
  assertUsableQuantity(quantity);
  if (!Number.isFinite(serving.baseQuantity) || serving.baseQuantity <= 0) {
    throw new Error("Serving base quantity must be a positive finite number.");
  }

  if (unit === serving.baseUnit) {
    return quantity / serving.baseQuantity;
  }

  if (isMassUnit(unit)) {
    const inputGrams = toBaseMass(quantity, unit);
    const baseGrams = isMassUnit(serving.baseUnit)
      ? toBaseMass(serving.baseQuantity, serving.baseUnit)
      : serving.gramWeight ?? null;
    if (inputGrams !== null && baseGrams !== null && baseGrams > 0) {
      return inputGrams / baseGrams;
    }
  }

  if (isVolumeUnit(unit)) {
    const inputMl = toBaseVolume(quantity, unit);
    const baseMl = isVolumeUnit(serving.baseUnit)
      ? toBaseVolume(serving.baseQuantity, serving.baseUnit)
      : serving.mlVolume ?? null;
    if (inputMl !== null && baseMl !== null && baseMl > 0) {
      return inputMl / baseMl;
    }
  }

  if (unit === "serving") {
    return quantity;
  }

  if (serving.baseUnit === "serving") {
    const knownBase = convertServingToKnownBase(serving);
    if (knownBase !== null && knownBase > 0) {
      if (isMassUnit(unit)) {
        const inputGrams = toBaseMass(quantity, unit);
        if (inputGrams !== null) return inputGrams / knownBase;
      }
      if (isVolumeUnit(unit)) {
        const inputMl = toBaseVolume(quantity, unit);
        if (inputMl !== null) return inputMl / knownBase;
      }
    }
  }

  if (directCountUnits.includes(unit) && directCountUnits.includes(serving.baseUnit)) {
    throw new Error(`Cannot convert ${unit} to ${serving.baseUnit} without a serving definition.`);
  }

  throw new Error(`Unsupported unit conversion from ${unit} to ${serving.baseUnit}.`);
}

function scaleNullable(value: number | null | undefined, scale: number): number | null {
  if (value === null || value === undefined) return value ?? null;
  return round(value * scale);
}

export function round(value: number, precision = 4): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function scaleNutrients(nutrients: NutrientAmount, scale: number): NutrientAmount {
  const scaledMicros: Record<string, number | null> = {};
  for (const [key, value] of Object.entries(nutrients.micronutrients ?? {})) {
    scaledMicros[key] = scaleNullable(value, scale);
  }

  return {
    calories: scaleNullable(nutrients.calories, scale),
    proteinG: scaleNullable(nutrients.proteinG, scale),
    carbsG: scaleNullable(nutrients.carbsG, scale),
    fatG: scaleNullable(nutrients.fatG, scale),
    saturatedFatG: scaleNullable(nutrients.saturatedFatG, scale),
    fiberG: scaleNullable(nutrients.fiberG, scale),
    sugarG: scaleNullable(nutrients.sugarG, scale),
    sodiumMg: scaleNullable(nutrients.sodiumMg, scale),
    cholesterolMg: scaleNullable(nutrients.cholesterolMg, scale),
    micronutrients: scaledMicros
  };
}

function addValue(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a === null || a === undefined) return b ?? null;
  if (b === null || b === undefined) return a;
  return round(a + b);
}

export function addNutrients(a: NutrientAmount, b: NutrientAmount): NutrientAmount {
  const micronutrients = { ...(a.micronutrients ?? {}) };
  for (const [key, value] of Object.entries(b.micronutrients ?? {})) {
    micronutrients[key] = addValue(micronutrients[key], value);
  }

  return {
    calories: addValue(a.calories, b.calories),
    proteinG: addValue(a.proteinG, b.proteinG),
    carbsG: addValue(a.carbsG, b.carbsG),
    fatG: addValue(a.fatG, b.fatG),
    saturatedFatG: addValue(a.saturatedFatG, b.saturatedFatG),
    fiberG: addValue(a.fiberG, b.fiberG),
    sugarG: addValue(a.sugarG, b.sugarG),
    sodiumMg: addValue(a.sodiumMg, b.sodiumMg),
    cholesterolMg: addValue(a.cholesterolMg, b.cholesterolMg),
    micronutrients
  };
}

export function calculateFoodNutrition(food: FoodSnapshot, quantity: number, unit: Unit): NutrientAmount {
  const scale = calculateScale(food.serving, quantity, unit);
  return scaleNutrients(food.nutrientsPerServing, scale);
}

export function calculateMealNutrition(items: MealItemInput[]): MealCalculation {
  const calculatedItems: CalculatedMealItem[] = items.map((item) => ({
    ...item,
    nutrients: calculateFoodNutrition(item.food, item.quantity, item.unit)
  }));

  const total = calculatedItems.reduce<NutrientAmount>(
    (sum, item) => addNutrients(sum, item.nutrients),
    { micronutrients: {} }
  );

  return {
    items: calculatedItems,
    total
  };
}

export function calculateRecipePerServing(items: MealItemInput[], servings: number): NutrientAmount {
  assertUsableQuantity(servings);
  const total = calculateMealNutrition(items).total;
  return scaleNutrients(total, 1 / servings);
}
