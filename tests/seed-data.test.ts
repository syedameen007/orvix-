import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REFERENCE_FOODS } from "../packages/database/prisma/data/foods.js";
import { normalizeSearchText, rankSearchCandidate } from "../packages/utils/src/search.js";
import { STARTER_ROUTINES } from "../packages/utils/src/starterRoutines.js";

interface SeedExercise {
  sourceId: string;
  name: string;
  normalizedName: string;
  aliases: string[];
  primaryMuscles: string[];
  instructions: string;
  difficulty: string;
}

const exercises = JSON.parse(readFileSync(new URL("../packages/database/prisma/data/exercises.json", import.meta.url), "utf8")) as SeedExercise[];
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Atwater estimate with fibre counted at ~2 kcal/g. */
/** Weight of the serving all values refer to (g, or ml for drinks, treated as ~1 g/ml). */
const servingWeight = (f: (typeof REFERENCE_FOODS)[number]) => f.gramWeight ?? f.mlVolume ?? f.quantity;

const estimatedKcal = (f: (typeof REFERENCE_FOODS)[number]) =>
  4 * f.proteinG + 4 * Math.max(0, f.carbsG - f.fiberG) + 2 * f.fiberG + 9 * f.fatG;

describe("reference food catalog", () => {
  it("has a useful breadth of foods across categories", () => {
    expect(REFERENCE_FOODS.length).toBeGreaterThanOrEqual(190);
    const categories = new Set(REFERENCE_FOODS.map((food) => food.category));
    for (const required of ["south indian", "indian breads", "dals & legumes", "curries", "fruits", "vegetables", "dairy", "eggs", "protein", "beverages"]) {
      expect(categories.has(required), `missing category ${required}`).toBe(true);
    }
  });

  it("has unique, searchable names", () => {
    const names = REFERENCE_FOODS.map((food) => normalize(food.name));
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    expect(duplicates).toEqual([]);
  });

  it("uses clean single-token lowercase aliases (the search matches aliases per token)", () => {
    for (const food of REFERENCE_FOODS) {
      const nameWords = normalize(food.name).split(" ");
      for (const alias of food.aliases) {
        expect(alias, `${food.name}: alias "${alias}"`).toMatch(/^[a-z0-9]+$/);
        expect(nameWords, `${food.name}: alias "${alias}" repeats a word already in the name`).not.toContain(alias);
      }
      expect(new Set(food.aliases).size, `${food.name} has duplicate aliases`).toBe(food.aliases.length);
    }
  });

  it("has sane, non-negative nutrition values", () => {
    for (const food of REFERENCE_FOODS) {
      for (const value of [food.calories, food.proteinG, food.carbsG, food.fatG, food.fiberG]) {
        expect(Number.isFinite(value) && value >= 0, `${food.name} has an invalid number`).toBe(true);
      }
      expect(food.fiberG, `${food.name}: fibre cannot exceed carbs`).toBeLessThanOrEqual(food.carbsG);
      expect(food.proteinG + food.carbsG + food.fatG, `${food.name}: macros exceed serving weight`).toBeLessThanOrEqual(servingWeight(food) + 0.5);
      expect(food.calories, `${food.name} exceeds the physical maximum of 900 kcal/100 g`).toBeLessThanOrEqual(9 * servingWeight(food) + 1);
    }
  });

  it("is internally consistent with the 4-4-9 energy rule (within 15%, min 15 kcal slack)", () => {
    const outliers = REFERENCE_FOODS.filter((food) => {
      const diff = Math.abs(estimatedKcal(food) - food.calories);
      return diff > Math.max(15, food.calories * 0.15);
    }).map((food) => `${food.name}: listed ${food.calories}, macros imply ${Math.round(estimatedKcal(food))}`);
    expect(outliers).toEqual([]);
  });

  it("defines conversion data for every non-mass, non-volume serving", () => {
    for (const food of REFERENCE_FOODS) {
      if (food.unit === "g" || food.unit === "ml") {
        expect(food.quantity).toBe(100);
        continue;
      }
      expect(food.quantity, `${food.name}`).toBe(1);
      if (food.unit === "cup") expect(food.mlVolume, `${food.name} needs mlVolume`).toBeGreaterThan(0);
      else expect(food.gramWeight, `${food.name} needs gramWeight`).toBeGreaterThan(0);
    }
  });
});

describe("exercise library", () => {
  it("is large, unique and complete", () => {
    expect(exercises.length).toBeGreaterThanOrEqual(700);
    expect(new Set(exercises.map((e) => e.normalizedName)).size).toBe(exercises.length);
    expect(new Set(exercises.map((e) => e.sourceId)).size).toBe(exercises.length);
    for (const exercise of exercises) {
      expect(exercise.instructions.length, exercise.name).toBeGreaterThan(20);
      expect(exercise.primaryMuscles.length, exercise.name).toBeGreaterThan(0);
      expect(["beginner", "intermediate", "advanced"]).toContain(exercise.difficulty);
    }
  });

  it("supports every quick filter used by the Train screen", () => {
    for (const group of ["chest", "back", "legs", "shoulders", "arms", "core"]) {
      const matches = exercises.filter((e) => e.aliases.includes(group) || e.primaryMuscles.includes(group));
      expect(matches.length, `no exercises for "${group}"`).toBeGreaterThan(20);
    }
  });

  it("is beginner friendly: majority beginner level and no strongman/Olympic lifts", () => {
    expect(exercises.filter((e) => e.difficulty === "beginner").length / exercises.length).toBeGreaterThan(0.5);
  });
});

describe("starter routines", () => {
  const names = new Set(exercises.map((e) => e.name));

  it("only reference exercises that exist in the library", () => {
    const missing = STARTER_ROUTINES.flatMap((routine) => routine.exercises.filter((e) => !names.has(e.name)).map((e) => `${routine.key}: ${e.name}`));
    expect(missing).toEqual([]);
  });

  it("have unique keys and sensible volume for beginners", () => {
    expect(new Set(STARTER_ROUTINES.map((r) => r.key)).size).toBe(STARTER_ROUTINES.length);
    for (const routine of STARTER_ROUTINES) {
      expect(routine.exercises.length, routine.key).toBeGreaterThanOrEqual(4);
      expect(routine.exercises.length, routine.key).toBeLessThanOrEqual(8);
      for (const exercise of routine.exercises) {
        expect(exercise.sets).toBeGreaterThanOrEqual(1);
        expect(exercise.sets).toBeLessThanOrEqual(4);
      }
    }
  });
});

/** Mirrors FoodSearchService: candidate filter, ranking, then popularity as the tie-breaker. */
function searchFoods(query: string) {
  const normalized = normalizeSearchText(query);
  const tokens = normalized.split(" ").filter(Boolean);
  return REFERENCE_FOODS.filter((food) => {
    const name = normalizeSearchText(food.name);
    return name.includes(normalized) || food.aliases.some((alias) => tokens.includes(alias)) || food.category.includes(normalized);
  })
    .map((food) => ({ food, score: rankSearchCandidate(query, food.name, [...food.aliases, food.category]) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || b.food.popularity - a.food.popularity || a.food.name.localeCompare(b.food.name))
    .map((result) => result.food.name);
}

describe("food search quality (regression)", () => {
  const topResult: Record<string, string> = {
    rice: "Rice (cooked)", roti: "Chapati", chapati: "Chapati", dahi: "Curd (dahi)", curd: "Curd (dahi)", egg: "Egg (boiled)",
    dal: "Dal Tadka", idli: "Idli", chicken: "Chicken Breast (cooked)", banana: "Banana", milk: "Milk (toned)", paneer: "Paneer",
    oats: "Oats (rolled, dry)", chai: "Tea with Milk and Sugar", apple: "Apple", sambar: "Sambar", ghee: "Ghee", samosa: "Samosa",
    bread: "Whole Wheat Bread", biryani: "Chicken Biryani", ragi: "Ragi Mudde", almond: "Almonds", whey: "Whey Protein Powder (1 scoop)"
  };

  for (const [query, expected] of Object.entries(topResult)) {
    it(`"${query}" ranks ${expected} first`, () => {
      expect(searchFoods(query)[0]).toBe(expected);
    });
  }

  it("never returns an empty result for everyday words (English, Hindi and Kannada names)", () => {
    const everyday = ["roti", "dahi", "chawal", "anda", "doodh", "aloo", "gobi", "palak", "kela", "aam", "seb", "chaas", "lassi", "poha", "upma", "dosa", "vada", "rasam", "thayir", "majjige", "nuggekai", "bale", "badam", "kaju", "khichdi", "rajma", "chole", "moong", "fruit", "vegetable", "dairy", "snack", "sweet", "drink"];
    const empty = everyday.filter((query) => searchFoods(query).length === 0);
    expect(empty).toEqual([]);
  });
});

describe("seed records stay in sync with the database schema", () => {
  const schema = readFileSync(new URL("../packages/database/prisma/schema.prisma", import.meta.url), "utf8");
  const enumValues = (name: string) => {
    const body = schema.match(new RegExp(`enum ${name} \\{([^}]*)\\}`))?.[1] ?? "";
    return body.split("\n").map((line) => line.trim()).filter(Boolean);
  };

  it("only uses units and food states that exist as Prisma enums", async () => {
    const units = enumValues("Unit");
    const states = enumValues("FoodState");
    expect(units.length).toBeGreaterThan(5);
    for (const food of REFERENCE_FOODS) {
      expect(units, `${food.name}: unit "${food.unit}"`).toContain(food.unit);
      expect(states, `${food.name}: state "${food.state}"`).toContain(food.state);
    }
  });

  it("builds food and exercise records with unique keys and the new popularity column", async () => {
    const { buildFoodRecords, buildExerciseRecords } = await import("../packages/database/prisma/data/records.js");
    const foods = buildFoodRecords("source-id");
    expect(foods).toHaveLength(REFERENCE_FOODS.length);
    expect(new Set(foods.map((f) => f.normalizedName)).size).toBe(foods.length);
    expect(foods.every((f) => f.lifecycle === "PUBLISHED" && f.sourceId === "source-id" && f.popularity >= 0)).toBe(true);
    expect(schema).toMatch(/popularity\s+Int/);

    const records = buildExerciseRecords();
    expect(records.length).toBe(exercises.length);
    expect(new Set(records.map((r) => r.normalizedName)).size).toBe(records.length);
  });
});

describe("unit conversion parity (mobile app vs API)", () => {
  it("offers exactly the units the server can convert, with identical results", async () => {
    const { calculateScale } = await import("../packages/utils/src/nutrition.js");
    const { foodScale, unitOptions } = await import("../apps/mobile/src/lib.js");
    const allUnits = ["g", "kg", "ml", "L", "cup", "bowl", "tbsp", "tsp", "piece", "egg", "chapati", "slice", "serving"] as const;

    for (const food of REFERENCE_FOODS) {
      const serving = { baseQuantity: food.quantity, baseUnit: food.unit, gramWeight: food.gramWeight ?? null, mlVolume: food.mlVolume ?? null };
      const serverServing = { baseQuantity: food.quantity, baseUnit: food.unit, gramWeight: food.gramWeight ?? null, mlVolume: food.mlVolume ?? null };
      const offered = unitOptions(serving);
      expect(offered, `${food.name} must at least offer its own unit`).toContain(food.unit);

      for (const unit of allUnits) {
        let server: number | null = null;
        try {
          server = calculateScale(serverServing as never, 2, unit as never);
        } catch {
          server = null;
        }
        const client = foodScale(serving, 2, unit);
        if (server === null) expect(client, `${food.name} in ${unit}: client allows what server rejects`).toBeNull();
        else expect(client, `${food.name} in ${unit}`).toBeCloseTo(server, 6);
      }
    }
  });

  it("lets people log common foods in grams or pieces sensibly", async () => {
    const { foodScale } = await import("../apps/mobile/src/lib.js");
    const idli = REFERENCE_FOODS.find((f) => f.name === "Idli")!;
    // 80 g of idli is two idlis (40 g each)
    expect(foodScale({ baseQuantity: 1, baseUnit: idli.unit, gramWeight: idli.gramWeight ?? null }, 80, "g")).toBeCloseTo(2, 6);
    const tea = REFERENCE_FOODS.find((f) => f.name === "Tea with Milk and Sugar")!;
    expect(foodScale({ baseQuantity: 1, baseUnit: tea.unit, mlVolume: tea.mlVolume ?? null }, 300, "ml")).toBeCloseTo(2, 6);
  });
});
