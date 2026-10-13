import { Router } from "express";
import { prisma } from "@orvix/database";
import { customFoodSchema } from "@orvix/validation";
import { normalizeSearchText } from "@orvix/utils";
import { asyncHandler, ApiError } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";
import { FoodSearchService } from "../services/foodSearchService.js";
import { foodToSnapshot } from "../services/nutritionMapper.js";
import { OpenFoodFactsService } from "../services/externalFoodService.js";

export const foodsRouter = Router();
const searchService = new FoodSearchService();
const openFoodFacts = new OpenFoodFactsService();

foodsRouter.use(requireAuth);

foodsRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const query = String(req.query.q ?? "");
    let foods = await searchService.search(userId, query);
    if (query.trim().length >= 2 && foods.length < 15) {
      await openFoodFacts.importSearch(query, 18);
      foods = await searchService.search(userId, query);
    }
    res.json({
      results: foods.map((food) => ({
        ...foodToSnapshot(food),
        category: food.category,
        barcodes: food.barcodes.map((barcode) => barcode.code),
        source: food.sourceId,
        lifecycle: food.lifecycle
      }))
    });
  })
);

foodsRouter.get(
  "/barcode/:code",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const code = req.params.code;
    if (!code) throw new ApiError(400, "Barcode is required");
    const food = await searchService.findBarcode(userId, code);
    if (food) {
      return res.json({ found: true, product: foodToSnapshot(food), source: "database" });
    }
    const imported = await openFoodFacts.importByBarcode(code);
    if (imported) {
      return res.json({ found: true, product: foodToSnapshot(imported), source: "open_food_facts" });
    }
    return res.status(404).json({
      found: false,
      provider: "open_food_facts",
      nextActions: ["scan nutrition label", "scan product package", "manually create product", "enter nutrition manually"]
    });
  })
);

foodsRouter.post(
  "/custom",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = customFoodSchema.parse(req.body);
    const brand = input.brandName
      ? await prisma.brand.upsert({
          where: { name: input.brandName },
          update: {},
          create: { name: input.brandName }
        })
      : null;

    const food = await prisma.food.create({
      data: {
        ownerId: userId,
        brandId: brand?.id,
        name: input.name,
        normalizedName: normalizeSearchText(input.name),
        category: input.category,
        foodState: input.foodState,
        servingQuantity: input.servingQuantity,
        servingUnit: input.servingUnit,
        gramWeight: input.gramWeight,
        mlVolume: input.mlVolume,
        calories: input.nutrients.calories,
        proteinG: input.nutrients.proteinG,
        carbsG: input.nutrients.carbsG,
        fatG: input.nutrients.fatG,
        saturatedFatG: input.nutrients.saturatedFatG,
        fiberG: input.nutrients.fiberG,
        sugarG: input.nutrients.sugarG,
        sodiumMg: input.nutrients.sodiumMg,
        cholesterolMg: input.nutrients.cholesterolMg,
        micronutrients: input.nutrients.micronutrients ?? {},
        ingredients: input.ingredients,
        allergens: input.allergens,
        verificationState: "USER_SUBMITTED",
        lifecycle: "PUBLISHED",
        notes: input.notes,
        barcodes: input.barcode
          ? {
              create: {
                code: input.barcode
              }
            }
          : undefined,
        submissions: {
          create: {
            userId,
            type: "FOOD",
            payload: input,
            verificationState: "USER_SUBMITTED",
            lifecycle: "REVIEW"
          }
        }
      },
      include: { brand: true, barcodes: true }
    });

    res.status(201).json({ food: foodToSnapshot(food), lifecycle: food.lifecycle });
  })
);

foodsRouter.post(
  "/:id/favorite",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const foodId = req.params.id;
    if (!foodId) throw new ApiError(400, "Food id is required");
    const food = await prisma.food.findFirst({
      where: { id: foodId, OR: [{ ownerId: null }, { ownerId: userId }] }
    });
    if (!food) throw new ApiError(404, "Food not found");
    await prisma.favoriteFood.upsert({
      where: { userId_foodId: { userId, foodId: food.id } },
      update: {},
      create: { userId, foodId: food.id }
    });
    res.json({ ok: true });
  })
);
