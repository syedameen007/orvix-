import { Router } from "express";
import { z } from "zod";
import type { Unit } from "@orvix/types";
import { calculateMealNutrition, parseVoiceFoodLog } from "@orvix/utils";
import { prisma } from "@orvix/database";
import { voiceLogSchema } from "@orvix/validation";
import { asyncHandler, ApiError } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";
import { FoodSearchService } from "../services/foodSearchService.js";
import { OpenFoodFactsService } from "../services/externalFoodService.js";
import { OcrProvider, VisionProvider } from "../services/providerServices.js";
import { asInputJson, foodToSnapshot, nutrientColumns } from "../services/nutritionMapper.js";

export const scannerRouter = Router();
scannerRouter.use(requireAuth);

const imageSchema = z.object({
  imageUrl: z.string().url()
});

const units = ["g", "kg", "mg", "ml", "L", "cup", "bowl", "plate", "tbsp", "tsp", "piece", "egg", "chapati", "slice", "serving", "custom"] as const;
const barcodeLogSchema = z.object({
  code: z.string().min(3).max(64),
  date: z.string().optional(),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "CUSTOM"]).default("SNACK"),
  quantity: z.number().positive().optional(),
  unit: z.enum(units).optional()
});

const foodSearch = new FoodSearchService();
const openFoodFacts = new OpenFoodFactsService();
const ocrProvider = new OcrProvider();
const visionProvider = new VisionProvider();

function parseDay(value: string) {
  const day = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime())) throw new ApiError(400, "Invalid date");
  return day;
}

function nextDay(day: Date) {
  const end = new Date(day);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

async function appendFoodToMeal(
  userId: string,
  food: Parameters<typeof foodToSnapshot>[0],
  input: z.infer<typeof barcodeLogSchema>
) {
  const snapshot = foodToSnapshot(food);
  const quantity = input.quantity ?? snapshot.serving.baseQuantity;
  const unit = (input.unit ?? snapshot.serving.baseUnit) as Unit;
  const day = parseDay(input.date ?? new Date().toISOString().slice(0, 10));

  return prisma.$transaction(async (tx) => {
    const existing = await tx.meal.findFirst({
      where: { userId, mealType: input.mealType, date: { gte: day, lt: nextDay(day) } },
      include: { items: { include: { food: { include: { brand: true } } } } }
    });

    const allItems = [
      ...(existing?.items.map((item) => ({
        food: foodToSnapshot(item.food),
        quantity: item.quantity,
        unit: item.unit as Unit
      })) ?? []),
      { food: snapshot, quantity, unit }
    ];
    const calculation = calculateMealNutrition(allItems);
    const newItem = calculation.items.at(-1);
    if (!newItem) throw new ApiError(400, "Could not calculate scanned food nutrition");

    if (!existing) {
      const created = await tx.meal.create({
        data: {
          userId,
          date: day,
          mealType: input.mealType,
          customName: `${input.mealType[0]}${input.mealType.slice(1).toLowerCase()}`,
          calories: calculation.total.calories,
          proteinG: calculation.total.proteinG,
          carbsG: calculation.total.carbsG,
          fatG: calculation.total.fatG,
          fiberG: calculation.total.fiberG,
          items: {
            create: {
              food: { connect: { id: snapshot.id } },
              quantity,
              unit,
              foodSnapshot: asInputJson(snapshot),
              ...nutrientColumns(newItem.nutrients)
            }
          }
        },
        include: { items: true }
      });
      await tx.recentFood.upsert({
        where: { userId_foodId: { userId, foodId: snapshot.id } },
        update: { usedAt: new Date() },
        create: { userId, foodId: snapshot.id }
      });
      return created;
    }

    await tx.mealItem.create({
      data: {
        mealId: existing.id,
        foodId: snapshot.id,
        quantity,
        unit,
        foodSnapshot: asInputJson(snapshot),
        ...nutrientColumns(newItem.nutrients)
      }
    });
    await tx.meal.update({
      where: { id: existing.id },
      data: {
        calories: calculation.total.calories,
        proteinG: calculation.total.proteinG,
        carbsG: calculation.total.carbsG,
        fatG: calculation.total.fatG,
        fiberG: calculation.total.fiberG
      }
    });
    await tx.recentFood.upsert({
      where: { userId_foodId: { userId, foodId: snapshot.id } },
      update: { usedAt: new Date() },
      create: { userId, foodId: snapshot.id }
    });

    return tx.meal.findUniqueOrThrow({ where: { id: existing.id }, include: { items: true } });
  });
}

scannerRouter.post(
  "/barcode",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = barcodeLogSchema.parse(req.body);
    const cleaned = input.code.replace(/\D/g, "");
    if (!cleaned) throw new ApiError(400, "Barcode is required");

    let food = await foodSearch.findBarcode(userId, cleaned);
    let source = "database";
    if (!food) {
      food = await openFoodFacts.importByBarcode(cleaned);
      source = "open_food_facts";
    }
    if (!food) throw new ApiError(404, "Barcode was not found in the open food database");

    const meal = await appendFoodToMeal(userId, food, { ...input, code: cleaned });
    res.status(source === "database" ? 200 : 201).json({
      found: true,
      added: true,
      source,
      food: foodToSnapshot(food),
      meal
    });
  })
);

scannerRouter.post(
  "/ocr",
  asyncHandler(async (req, res) => {
    const input = imageSchema.parse(req.body);
    const result = await ocrProvider.extractNutritionLabel(input.imageUrl);
    res.status(result.configured ? 202 : 501).json({
      flow: "CAMERA -> OCR -> STRUCTURED_NUTRITION -> USER_CONFIRMATION -> SAVE_PRODUCT -> LOG_FOOD",
      result
    });
  })
);

scannerRouter.post(
  "/food-photo",
  asyncHandler(async (req, res) => {
    const input = imageSchema.parse(req.body);
    const result = await visionProvider.detectFoods(input.imageUrl);
    res.status(result.configured ? 202 : 501).json({
      flow: "PHOTO -> VISION_MODEL -> MULTIPLE_FOOD_DETECTION -> DATABASE_MATCH -> USER_CONFIRMATION -> MEAL",
      result
    });
  })
);

scannerRouter.post(
  "/voice",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = voiceLogSchema.parse(req.body);
    const parsed = parseVoiceFoodLog(input.transcript);
    const resolved = await Promise.all(
      parsed.map(async (item) => {
        const matches = await foodSearch.search(userId, item.query, 5);
        return {
          ...item,
          matches: matches.map((food) => foodToSnapshot(food))
        };
      })
    );
    res.json({
      flow: "VOICE -> PARSER -> FOOD_SEARCH -> DATABASE_MATCH -> DETERMINISTIC_NUTRITION -> USER_CONFIRMATION -> SAVE",
      parsed: resolved
    });
  })
);
