import { describe, expect, it } from "vitest";
import type { FoodSnapshot, MealItemInput } from "@orvix/types";
import { calculateFoodNutrition, calculateMealNutrition } from "../packages/utils/src/nutrition.js";

const testFood: FoodSnapshot = {
  id: "test-food",
  name: "Test Food",
  state: "COOKED",
  verification: "OPEN_DATA",
  serving: {
    baseQuantity: 100,
    baseUnit: "g"
  },
  nutrientsPerServing: {
    calories: 200,
    proteinG: 20,
    carbsG: 10,
    fatG: 5,
    fiberG: 2
  }
};

describe("deterministic nutrition calculations", () => {
  it("calculates arbitrary gram quantities dynamically", () => {
    expect(calculateFoodNutrition(testFood, 105, "g").calories).toBe(210);
    expect(calculateFoodNutrition(testFood, 137, "g").calories).toBe(274);
    expect(calculateFoodNutrition(testFood, 250, "g").calories).toBe(500);
  });

  it("sums multi-food meals and updates totals when a quantity changes", () => {
    const chicken: FoodSnapshot = {
      ...testFood,
      id: "chicken",
      name: "Chicken",
      nutrientsPerServing: { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fiberG: 0 }
    };
    const milk: FoodSnapshot = {
      ...testFood,
      id: "milk",
      name: "Milk",
      serving: { baseQuantity: 100, baseUnit: "ml" },
      nutrientsPerServing: { calories: 58, proteinG: 3.1, carbsG: 4.8, fatG: 3, fiberG: 0 }
    };
    const egg: FoodSnapshot = {
      ...testFood,
      id: "egg",
      name: "Egg",
      serving: { baseQuantity: 1, baseUnit: "egg", gramWeight: 50 },
      nutrientsPerServing: { calories: 72, proteinG: 6.3, carbsG: 0.4, fatG: 4.8, fiberG: 0 }
    };
    const chapati: FoodSnapshot = {
      ...testFood,
      id: "chapati",
      name: "Chapati",
      serving: { baseQuantity: 1, baseUnit: "chapati", gramWeight: 40 },
      nutrientsPerServing: { calories: 120, proteinG: 3.1, carbsG: 18, fatG: 3.7, fiberG: 2.6 }
    };
    const banana: FoodSnapshot = {
      ...testFood,
      id: "banana",
      name: "Banana",
      nutrientsPerServing: { calories: 89, proteinG: 1.1, carbsG: 22.8, fatG: 0.3, fiberG: 2.6 }
    };

    const meal: MealItemInput[] = [
      { food: chicken, quantity: 105, unit: "g" },
      { food: milk, quantity: 250, unit: "ml" },
      { food: egg, quantity: 3, unit: "egg" },
      { food: chapati, quantity: 2, unit: "chapati" },
      { food: banana, quantity: 137, unit: "g" }
    ];

    const calculated = calculateMealNutrition(meal);
    const expectedCalories =
      165 * 1.05 +
      58 * 2.5 +
      72 * 3 +
      120 * 2 +
      89 * 1.37;
    expect(calculated.total.calories).toBeCloseTo(expectedCalories, 4);

    const changed = calculateMealNutrition(meal.map((item) => (item.food.id === "chicken" ? { ...item, quantity: 137 } : item)));
    expect(changed.total.calories).toBeGreaterThan(calculated.total.calories ?? 0);
    expect(changed.total.calories).toBeCloseTo(expectedCalories + 165 * 0.32, 4);
  });
});
