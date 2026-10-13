import { prisma } from "@orvix/database";
import { normalizeSearchText, rankSearchCandidate } from "@orvix/utils";

export class FoodSearchService {
  async search(userId: string, query: string, limit = 25) {
    const normalized = normalizeSearchText(query);
    const tokens = normalized.split(" ").filter(Boolean);

    const foods = await prisma.food.findMany({
      where: {
        OR: [{ ownerId: null, lifecycle: "PUBLISHED" }, { ownerId: userId }],
        ...(normalized
          ? {
              AND: [
                {
                  OR: [
                    { normalizedName: { contains: normalized, mode: "insensitive" } },
                    { name: { contains: query, mode: "insensitive" } },
                    { aliases: { hasSome: tokens } },
                    { category: { contains: normalized, mode: "insensitive" } },
                    { brand: { name: { contains: query, mode: "insensitive" } } },
                    { barcodes: { some: { code: query } } }
                  ]
                }
              ]
            }
          : {})
      },
      include: { brand: true, barcodes: true },
      take: 60
    });

    return foods
      .map((food) => ({
        food,
        score: rankSearchCandidate(query, `${food.brand?.name ?? ""} ${food.name}`, [
          ...food.aliases,
          food.category ?? "",
          ...food.barcodes.map((barcode) => barcode.code)
        ])
      }))
      .filter((result) => !normalized || result.score > 0)
      .sort((a, b) => b.score - a.score || b.food.popularity - a.food.popularity || a.food.name.localeCompare(b.food.name))
      .slice(0, limit)
      .map((result) => result.food);
  }

  async findBarcode(userId: string, code: string) {
    const barcode = await prisma.productBarcode.findUnique({
      where: { code },
      include: { food: { include: { brand: true, barcodes: true } } }
    });
    if (!barcode) return null;
    if (barcode.food.ownerId && barcode.food.ownerId !== userId) return null;
    return barcode.food;
  }
}
