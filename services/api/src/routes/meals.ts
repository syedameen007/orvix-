import { Router } from "express";
import { prisma } from "@orvix/database";
import type { Unit } from "@orvix/types";
import { calculateMealNutrition } from "@orvix/utils";
import { mealCreateSchema } from "@orvix/validation";
import { asyncHandler, ApiError } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";
import { asInputJson, foodToSnapshot, nutrientColumns } from "../services/nutritionMapper.js";

export const mealsRouter = Router();
mealsRouter.use(requireAuth);

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

async function buildCalculationItems(
  userId: string,
  items: Array<{ foodId: string; quantity: number; unit: Unit }>
) {
  const foods = await prisma.food.findMany({
    where: {
      id: { in: [...new Set(items.map((item) => item.foodId))] },
      OR: [{ ownerId: null, lifecycle: "PUBLISHED" }, { ownerId: userId }]
    },
    include: { brand: true }
  });
  const byId = new Map(foods.map((food) => [food.id, food]));
  if (byId.size !== new Set(items.map((item) => item.foodId)).size) {
    throw new ApiError(404, "One or more foods were not found or are private to another user");
  }

  return items.map((item) => {
    const food = byId.get(item.foodId);
    if (!food) throw new ApiError(404, "Food not found");
    return {
      food: foodToSnapshot(food),
      quantity: item.quantity,
      unit: item.unit
    };
  });
}

async function refreshMealTotals(mealId: string, userId: string) {
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, userId },
    include: { items: { include: { food: { include: { brand: true } } } } }
  });
  if (!meal) throw new ApiError(404, "Meal not found");

  const calculation = calculateMealNutrition(
    meal.items.map((item) => ({
      food: foodToSnapshot(item.food),
      quantity: item.quantity,
      unit: item.unit
    }))
  );

  await prisma.$transaction([
    ...meal.items.map((item, index) =>
      prisma.mealItem.update({
        where: { id: item.id },
        data: {
          ...nutrientColumns(calculation.items[index]!.nutrients),
          foodSnapshot: asInputJson(calculation.items[index]!.food)
        }
      })
    ),
    prisma.meal.update({
      where: { id: meal.id },
      data: {
        calories: calculation.total.calories,
        proteinG: calculation.total.proteinG,
        carbsG: calculation.total.carbsG,
        fatG: calculation.total.fatG,
        fiberG: calculation.total.fiberG
      }
    })
  ]);

  return prisma.meal.findUniqueOrThrow({
    where: { id: meal.id },
    include: { items: true }
  });
}

mealsRouter.get(
  "/daily",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const dateText = String(req.query.date ?? new Date().toISOString().slice(0, 10));
    const start = parseDay(dateText);
    const meals = await prisma.meal.findMany({
      where: { userId, date: { gte: start, lt: nextDay(start) } },
      include: { items: { include: { food: { include: { brand: true } } } } },
      orderBy: { createdAt: "asc" }
    });

    const total = meals.reduce(
      (sum, meal) => ({
        calories: (sum.calories ?? 0) + (meal.calories ?? 0),
        proteinG: (sum.proteinG ?? 0) + (meal.proteinG ?? 0),
        carbsG: (sum.carbsG ?? 0) + (meal.carbsG ?? 0),
        fatG: (sum.fatG ?? 0) + (meal.fatG ?? 0),
        fiberG: (sum.fiberG ?? 0) + (meal.fiberG ?? 0)
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
    );

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    res.json({
      date: start,
      targets: {
        calories: profile?.calorieTarget ?? null,
        proteinG: profile?.proteinTargetG ?? null,
        carbsG: profile?.carbTargetG ?? null,
        fatG: profile?.fatTargetG ?? null,
        fiberG: profile?.fiberTargetG ?? null,
        waterMl: profile?.waterTargetMl ?? null
      },
      total,
      meals
    });
  })
);

mealsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = mealCreateSchema.parse(req.body);
    const calculationItems = await buildCalculationItems(userId, input.items);
    const calculation = calculateMealNutrition(calculationItems);

    const meal = await prisma.$transaction(async (tx) => {
      const created = await tx.meal.create({
        data: {
          userId,
          date: parseDay(input.date),
          mealType: input.mealType,
          customName: input.customName,
          calories: calculation.total.calories,
          proteinG: calculation.total.proteinG,
          carbsG: calculation.total.carbsG,
          fatG: calculation.total.fatG,
          fiberG: calculation.total.fiberG,
          items: {
            create: calculation.items.map((item) => ({
              food: { connect: { id: item.food.id } },
              quantity: item.quantity,
              unit: item.unit,
              foodSnapshot: asInputJson(item.food),
              ...nutrientColumns(item.nutrients)
            }))
          }
        },
        include: { items: true }
      });

      for (const item of calculation.items) {
        await tx.recentFood.upsert({
          where: { userId_foodId: { userId, foodId: item.food.id } },
          update: { usedAt: new Date() },
          create: { userId, foodId: item.food.id }
        });
      }

      return created;
    });

    res.status(201).json(meal);
  })
);

mealsRouter.patch(
  "/items/:itemId",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const itemId = req.params.itemId;
    if (!itemId) throw new ApiError(400, "Meal item id is required");
    const quantity = Number(req.body.quantity);
    const unit = req.body.unit as Unit | undefined;
    if (!Number.isFinite(quantity) || quantity <= 0) throw new ApiError(400, "Quantity must be positive");
    const item = await prisma.mealItem.findFirst({
      where: { id: itemId, meal: { userId } }
    });
    if (!item) throw new ApiError(404, "Meal item not found");
    await prisma.mealItem.update({
      where: { id: item.id },
      data: { quantity, unit: unit ?? item.unit }
    });
    res.json(await refreshMealTotals(item.mealId, userId));
  })
);

mealsRouter.delete(
  "/items/:itemId",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const itemId = req.params.itemId;
    if (!itemId) throw new ApiError(400, "Meal item id is required");
    const item = await prisma.mealItem.findFirst({
      where: { id: itemId, meal: { userId } }
    });
    if (!item) throw new ApiError(404, "Meal item not found");
    await prisma.mealItem.delete({ where: { id: item.id } });
    res.json(await refreshMealTotals(item.mealId, userId));
  })
);

mealsRouter.post(
  "/:mealId/save",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const mealId = req.params.mealId;
    if (!mealId) throw new ApiError(400, "Meal id is required");
    const meal = await prisma.meal.findFirst({
      where: { id: mealId, userId },
      include: { items: true }
    });
    if (!meal) throw new ApiError(404, "Meal not found");
    const name = String(req.body.name ?? meal.customName ?? meal.mealType);
    const saved = await prisma.savedMeal.create({
      data: {
        userId,
        name,
        mealType: meal.mealType,
        calories: meal.calories,
        proteinG: meal.proteinG,
        carbsG: meal.carbsG,
        fatG: meal.fatG,
        fiberG: meal.fiberG,
        items: {
          create: meal.items.map((item) => ({
            food: { connect: { id: item.foodId } },
            quantity: item.quantity,
            unit: item.unit,
            foodSnapshot: asInputJson(item.foodSnapshot)
          }))
        }
      },
      include: { items: true }
    });
    res.status(201).json(saved);
  })
);

mealsRouter.get(
  "/saved",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const saved = await prisma.savedMeal.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { updatedAt: "desc" }
    });
    res.json({ saved });
  })
);
