import { prisma, type Brand, type Food, type ProductBarcode, type Unit } from "@orvix/database";
import { normalizeSearchText, round } from "@orvix/utils";

type FoodWithRelations = Food & { brand: Brand | null; barcodes: ProductBarcode[] };

interface OpenFoodFactsResponse {
  status?: number;
  product?: OpenFoodFactsProduct;
}

interface OpenFoodFactsSearchResponse {
  products?: OpenFoodFactsProduct[];
}

interface OpenFoodFactsProduct {
  code?: unknown;
  product_name?: unknown;
  generic_name?: unknown;
  brands?: unknown;
  categories?: unknown;
  serving_size?: unknown;
  serving_quantity?: unknown;
  product_quantity?: unknown;
  product_quantity_unit?: unknown;
  quantity?: unknown;
  nutriments?: Record<string, unknown>;
  ingredients_text?: unknown;
  allergens_tags?: unknown;
}

const OPEN_FOOD_FACTS_BASE = "https://world.openfoodfacts.org";
const OPEN_FOOD_FACTS_FIELDS = [
  "code",
  "product_name",
  "generic_name",
  "brands",
  "categories",
  "serving_size",
  "serving_quantity",
  "product_quantity",
  "product_quantity_unit",
  "quantity",
  "nutriments",
  "ingredients_text",
  "allergens_tags"
].join(",");

const USER_AGENT = "ORVIX/0.1 (https://files-pasted-by-the-user-orvix.vercel.app; contact: admin@orvix.local)";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function firstCsv(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)[0] ?? null;
}

function compactList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => text(item)?.replace(/^en:/, "").replace(/-/g, " "))
      .filter((item): item is string => Boolean(item));
  }
  return [];
}

function searchableAliases(...values: Array<string | null | undefined>): string[] {
  const aliases = new Set<string>();
  for (const value of values) {
    const normalized = value ? normalizeSearchText(value) : "";
    if (!normalized) continue;
    aliases.add(normalized);
    for (const token of normalized.split(" ")) {
      if (token.length >= 2) aliases.add(token);
    }
  }
  return [...aliases];
}

function parseServing(product: OpenFoodFactsProduct): {
  servingQuantity: number;
  servingUnit: Unit;
  gramWeight?: number;
  mlVolume?: number;
  label: string | null;
} {
  const servingSize = text(product.serving_size);
  const servingQuantity = numeric(product.serving_quantity);
  const parsedFromLabel = servingSize?.match(/(\d+(?:[.,]\d+)?)\s*(g|ml|l)\b/i);
  const parsedQuantity = parsedFromLabel ? Number(parsedFromLabel[1]!.replace(",", ".")) : null;
  const parsedUnit = parsedFromLabel?.[2]?.toLowerCase();
  const quantity = servingQuantity ?? parsedQuantity ?? 100;

  if (parsedUnit === "ml" || parsedUnit === "l" || /ml\b/i.test(servingSize ?? "")) {
    const ml = parsedUnit === "l" ? quantity * 1000 : quantity;
    return { servingQuantity: ml, servingUnit: "ml", mlVolume: ml, label: servingSize ?? `${round(ml, 1)} ml` };
  }

  return { servingQuantity: quantity, servingUnit: "g", gramWeight: quantity, label: servingSize ?? `${round(quantity, 1)} g` };
}

function nutrient(nutriments: Record<string, unknown>, key: string, scaleFrom100g: number): number | null {
  const serving = numeric(nutriments[`${key}_serving`]);
  if (serving !== null) return round(serving);
  const per100 = numeric(nutriments[`${key}_100g`]) ?? numeric(nutriments[key]);
  return per100 === null ? null : round(per100 * scaleFrom100g);
}

function energyKcal(nutriments: Record<string, unknown>, scaleFrom100g: number): number | null {
  const kcal = nutrient(nutriments, "energy-kcal", scaleFrom100g);
  if (kcal !== null) return kcal;
  const kj = nutrient(nutriments, "energy-kj", scaleFrom100g) ?? nutrient(nutriments, "energy", scaleFrom100g);
  return kj === null ? null : round(kj / 4.184);
}

function mapProduct(product: OpenFoodFactsProduct, requestedCode?: string) {
  const name = text(product.product_name) ?? text(product.generic_name);
  const code = text(product.code) ?? requestedCode;
  if (!name || !code) return null;

  const serving = parseServing(product);
  const scaleFrom100g = serving.servingUnit === "ml" ? serving.servingQuantity / 100 : serving.servingQuantity / 100;
  const nutriments = product.nutriments ?? {};
  const brandName = firstCsv(product.brands);
  const ingredientsText = text(product.ingredients_text);
  const category = firstCsv(product.categories);

  return {
    code,
    requestedCode,
    brandName,
    data: {
      ownerId: null,
      name,
      normalizedName: normalizeSearchText(name),
      aliases: searchableAliases(name, brandName ? `${brandName} ${name}` : null, category, text(product.quantity), serving.label),
      category,
      foodState: "PACKAGED" as const,
      verificationState: "OPEN_DATA" as const,
      lifecycle: "PUBLISHED" as const,
      servingQuantity: serving.servingQuantity,
      servingUnit: serving.servingUnit,
      gramWeight: serving.gramWeight,
      mlVolume: serving.mlVolume,
      calories: energyKcal(nutriments, scaleFrom100g),
      proteinG: nutrient(nutriments, "proteins", scaleFrom100g),
      carbsG: nutrient(nutriments, "carbohydrates", scaleFrom100g),
      fatG: nutrient(nutriments, "fat", scaleFrom100g),
      saturatedFatG: nutrient(nutriments, "saturated-fat", scaleFrom100g),
      fiberG: nutrient(nutriments, "fiber", scaleFrom100g),
      sugarG: nutrient(nutriments, "sugars", scaleFrom100g),
      sodiumMg: (() => {
        const sodiumG = nutrient(nutriments, "sodium", scaleFrom100g);
        return sodiumG === null ? null : round(sodiumG * 1000);
      })(),
      cholesterolMg: (() => {
        const cholesterolG = nutrient(nutriments, "cholesterol", scaleFrom100g);
        return cholesterolG === null ? null : round(cholesterolG * 1000);
      })(),
      micronutrients: {},
      ingredients: ingredientsText ? ingredientsText.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 80) : [],
      allergens: compactList(product.allergens_tags),
      notes: `Imported from Open Food Facts. Barcode: ${code}.`
    }
  };
}

async function openFoodFactsJson<T>(url: URL): Promise<T | null> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    }
  });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

export class OpenFoodFactsService {
  private async source() {
    const existing = await prisma.foodSource.findFirst({ where: { name: "Open Food Facts" } });
    if (existing) return existing;
    return prisma.foodSource.create({
      data: {
        name: "Open Food Facts",
        sourceType: "OPEN_FOOD_DATABASE",
        license: "Open Database License (ODbL)",
        sourceReference: "https://world.openfoodfacts.org",
        retrievedAt: new Date(),
        verificationStatus: "OPEN_DATA",
        notes: "Imported lazily from Open Food Facts barcode and search APIs."
      }
    });
  }

  async lookupBarcode(code: string): Promise<OpenFoodFactsProduct | null> {
    const cleaned = code.replace(/\D/g, "");
    if (!cleaned) return null;
    const url = new URL(`${OPEN_FOOD_FACTS_BASE}/api/v2/product/${cleaned}.json`);
    url.searchParams.set("fields", OPEN_FOOD_FACTS_FIELDS);
    const payload = await openFoodFactsJson<OpenFoodFactsResponse>(url);
    return payload?.status === 1 && payload.product ? payload.product : null;
  }

  async searchProducts(query: string, limit = 12): Promise<OpenFoodFactsProduct[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];
    const url = new URL(`${OPEN_FOOD_FACTS_BASE}/cgi/search.pl`);
    url.searchParams.set("search_terms", trimmed);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("page_size", String(limit));
    url.searchParams.set("fields", OPEN_FOOD_FACTS_FIELDS);
    const payload = await openFoodFactsJson<OpenFoodFactsSearchResponse>(url);
    return payload?.products ?? [];
  }

  async importProduct(product: OpenFoodFactsProduct, requestedCode?: string): Promise<FoodWithRelations | null> {
    const mapped = mapProduct(product, requestedCode);
    if (!mapped) return null;

    const source = await this.source();
    const brand = mapped.brandName
      ? await prisma.brand.upsert({
          where: { name: mapped.brandName },
          update: {},
          create: { name: mapped.brandName }
        })
      : null;

    const codes = [
      ...new Set([mapped.requestedCode?.replace(/\D/g, ""), mapped.code.replace(/\D/g, "")].filter((code): code is string => Boolean(code)))
    ];
    const existingBarcode = await prisma.productBarcode.findFirst({ where: { code: { in: codes } } });

    const food = existingBarcode
      ? await prisma.food.update({
          where: { id: existingBarcode.foodId },
          data: { ...mapped.data, brandId: brand?.id ?? null, sourceId: source.id },
          include: { brand: true, barcodes: true }
        })
      : await prisma.food.create({
          data: {
            ...mapped.data,
            brandId: brand?.id ?? null,
            sourceId: source.id
          },
          include: { brand: true, barcodes: true }
        });

    for (const code of codes) {
      await prisma.productBarcode.upsert({
        where: { code },
        update: { foodId: food.id },
        create: { code, format: code.length === 13 ? "EAN-13" : code.length === 12 ? "UPC-A" : undefined, foodId: food.id }
      });
    }

    return prisma.food.findUnique({
      where: { id: food.id },
      include: { brand: true, barcodes: true }
    });
  }

  async importByBarcode(code: string): Promise<FoodWithRelations | null> {
    const product = await this.lookupBarcode(code);
    return product ? this.importProduct(product, code) : null;
  }

  async importSearch(query: string, limit = 12): Promise<FoodWithRelations[]> {
    const products = await this.searchProducts(query, limit);
    const imported = await Promise.all(products.map((product) => this.importProduct(product)));
    return imported.filter((food): food is FoodWithRelations => Boolean(food));
  }
}
