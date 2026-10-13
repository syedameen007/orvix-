import { prisma, type Exercise } from "@orvix/database";
import { normalizeSearchText, rankSearchCandidate } from "@orvix/utils";

interface WgerExerciseInfo {
  id: number;
  category?: { name?: string };
  muscles?: Array<{ name?: string; name_en?: string }>;
  muscles_secondary?: Array<{ name?: string; name_en?: string }>;
  equipment?: Array<{ name?: string }>;
  images?: Array<{ image?: string; thumbnails?: { medium?: string; small?: string } }>;
  videos?: Array<{ video?: string }>;
  license?: { short_name?: string; url?: string };
  translations?: Array<{
    language?: number;
    name?: string;
    description?: string;
    description_source?: string;
    aliases?: Array<{ alias?: string }>;
    license_author?: string;
  }>;
}

interface WgerResponse {
  results?: WgerExerciseInfo[];
}

const WGER_URL = "https://wger.de/api/v2/exerciseinfo/?language=2&limit=1000";
let cachedCatalog: WgerExerciseInfo[] | null = null;

function cleanHtml(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

function cleanName(value: string | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function labels(items: Array<{ name?: string; name_en?: string }> | undefined): string[] {
  return [
    ...new Set(
      (items ?? [])
        .map((item) => cleanName(item.name_en || item.name))
        .filter((item): item is string => Boolean(item))
        .map((item) => item.toLowerCase())
    )
  ];
}

function searchableAliases(values: string[], id: number): string[] {
  const aliases = new Set<string>([`wger:${id}`]);
  for (const value of values) {
    const normalized = normalizeSearchText(value);
    if (!normalized) continue;
    aliases.add(normalized);
    for (const token of normalized.split(" ")) {
      if (token.length >= 2) aliases.add(token);
    }
  }
  return [...aliases];
}

function englishTranslation(item: WgerExerciseInfo) {
  return item.translations?.find((translation) => translation.language === 2 && cleanName(translation.name)) ?? item.translations?.find((translation) => cleanName(translation.name));
}

async function fetchCatalog(): Promise<WgerExerciseInfo[]> {
  if (cachedCatalog) return cachedCatalog;
  const response = await fetch(WGER_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) return [];
  const payload = (await response.json()) as WgerResponse;
  cachedCatalog = payload.results ?? [];
  return cachedCatalog;
}

export class ExerciseCatalogService {
  async searchAndImport(query: string, limit = 40): Promise<Exercise[]> {
    const normalized = normalizeSearchText(query);
    if (normalized.length < 2) return [];

    const catalog = await fetchCatalog();
    const candidates = catalog
      .map((item) => {
        const translation = englishTranslation(item);
        const name = cleanName(translation?.name);
        const aliases = (translation?.aliases ?? []).map((alias) => cleanName(alias.alias)).filter((alias): alias is string => Boolean(alias));
        const primaryMuscles = labels(item.muscles);
        const secondaryMuscles = labels(item.muscles_secondary);
        const equipment = labels(item.equipment);
        return {
          item,
          translation,
          name,
          aliases,
          primaryMuscles,
          secondaryMuscles,
          equipment,
          score: name
            ? rankSearchCandidate(query, name, [
                ...aliases,
                ...primaryMuscles,
                ...secondaryMuscles,
                ...equipment,
                item.category?.name ?? ""
              ])
            : 0
        };
      })
      .filter((candidate) => candidate.name && candidate.score > 0)
      .sort((a, b) => b.score - a.score || a.name!.localeCompare(b.name!))
      .slice(0, limit);

    const imported = await Promise.all(
      candidates.map(async (candidate) => {
        const normalizedName = normalizeSearchText(candidate.name!);
        const mediaUrl =
          candidate.item.images?.find((image) => image.thumbnails?.medium)?.thumbnails?.medium ??
          candidate.item.images?.find((image) => image.image)?.image ??
          candidate.item.videos?.find((video) => video.video)?.video ??
          null;
        const data = {
          ownerId: null,
          name: candidate.name!,
          normalizedName,
          aliases: searchableAliases([candidate.name!, ...candidate.aliases], candidate.item.id),
          primaryMuscles: candidate.primaryMuscles,
          secondaryMuscles: candidate.secondaryMuscles,
          equipment: candidate.equipment,
          movementPattern: candidate.item.category?.name?.toLowerCase() ?? null,
          difficulty: null,
          instructions: cleanHtml(candidate.translation?.description_source ?? candidate.translation?.description),
          safetyNotes: [
            "Imported from the wger open exercise database.",
            candidate.item.license?.short_name ? `License: ${candidate.item.license.short_name}.` : null,
            candidate.item.license?.url ? `License URL: ${candidate.item.license.url}.` : null,
            candidate.translation?.license_author ? `Author: ${candidate.translation.license_author}.` : null
          ]
            .filter(Boolean)
            .join(" "),
          mediaUrl,
          lifecycle: "PUBLISHED" as const
        };

        const existing = await prisma.exercise.findFirst({
          where: {
            ownerId: null,
            OR: [{ normalizedName }, { aliases: { has: `wger:${candidate.item.id}` } }]
          }
        });

        if (existing) {
          return prisma.exercise.update({ where: { id: existing.id }, data });
        }

        return prisma.exercise.create({ data });
      })
    );

    return imported;
  }
}
