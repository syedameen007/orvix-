import { Router } from "express";
import { prisma } from "@orvix/database";
import { calculateMealNutrition, calculateRecipePerServing } from "@orvix/utils";
import { recipeCreateSchema } from "@orvix/validation";
import { asyncHandler, ApiError } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";
import { asInputJson, foodToSnapshot } from "../services/nutritionMapper.js";

export const recipesRouter = Router();
recipesRouter.use(requireAuth);

async function getRecipeItems(userId: string, items: Array<{ foodId: string; quantity: number; unit: any }>) {
  const foods = await prisma.food.findMany({
    where: {
      id: { in: [...new Set(items.map((item) => item.foodId))] },
      OR: [{ ownerId: null, lifecycle: "PUBLISHED" }, { ownerId: userId }]
    },
    include: { brand: true }
  });
  const byId = new Map(foods.map((food) => [food.id, food]));
  if (byId.size !== new Set(items.map((item) => item.foodId)).size) {
    throw new ApiError(404, "One or more foods were not found");
  }
  return items.map((item) => {
    const food = byId.get(item.foodId);
    if (!food) throw new ApiError(404, "Food not found");
    return { food: foodToSnapshot(food), quantity: item.quantity, unit: item.unit };
  });
}

recipesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const recipes = await prisma.recipe.findMany({
      where: { userId, archivedAt: null },
      include: { ingredients: true },
      orderBy: { updatedAt: "desc" }
    });
    res.json({ recipes });
  })
);

recipesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = recipeCreateSchema.parse(req.body);
    const calculationItems = await getRecipeItems(userId, input.items);
    const total = calculateMealNutrition(calculationItems).total;
    const perServing = calculateRecipePerServing(calculationItems, input.servings);
    const recipe = await prisma.recipe.create({
      data: {
        userId,
        name: input.name,
        servings: input.servings,
        calories: perServing.calories,
        proteinG: perServing.proteinG,
        carbsG: perServing.carbsG,
        fatG: perServing.fatG,
        fiberG: perServing.fiberG,
        notes: `Total calories: ${total.calories ?? "unavailable"}`,
        ingredients: {
          create: calculationItems.map((item) => ({
            food: { connect: { id: item.food.id } },
            quantity: item.quantity,
            unit: item.unit,
            foodSnapshot: asInputJson(item.food)
          }))
        }
      },
      include: { ingredients: true }
    });
    res.status(201).json({ recipe, perServing, total });
  })
);

recipesRouter.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const recipeId = req.params.id;
    if (!recipeId) throw new ApiError(400, "Recipe id is required");
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, userId },
      include: { ingredients: true }
    });
    if (!recipe) throw new ApiError(404, "Recipe not found");
    const duplicated = await prisma.recipe.create({
      data: {
        userId,
        name: String(req.body.name ?? `${recipe.name} Copy`),
        servings: recipe.servings,
        calories: recipe.calories,
        proteinG: recipe.proteinG,
        carbsG: recipe.carbsG,
        fatG: recipe.fatG,
        fiberG: recipe.fiberG,
        notes: recipe.notes,
        ingredients: {
          create: recipe.ingredients.map((ingredient) => ({
            food: { connect: { id: ingredient.foodId } },
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            foodSnapshot: asInputJson(ingredient.foodSnapshot)
          }))
        }
      },
      include: { ingredients: true }
    });
    res.status(201).json(duplicated);
  })
);

recipesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const recipeId = req.params.id;
    if (!recipeId) throw new ApiError(400, "Recipe id is required");
    await prisma.recipe.updateMany({
      where: { id: recipeId, userId },
      data: { archivedAt: new Date() }
    });
    res.json({ ok: true });
  })
);
