import { Router } from "express";
import { prisma } from "@orvix/database";
import { normalizeSearchText, rankSearchCandidate } from "@orvix/utils";
import { customExerciseSchema } from "@orvix/validation";
import { asyncHandler } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";
import { ExerciseCatalogService } from "../services/exerciseCatalogService.js";

export const exercisesRouter = Router();
exercisesRouter.use(requireAuth);
const exerciseCatalog = new ExerciseCatalogService();

exercisesRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const query = String(req.query.q ?? "");
    const normalized = normalizeSearchText(query);
    const tokens = normalized.split(" ").filter(Boolean);
    const exercises = await prisma.exercise.findMany({
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
                    { primaryMuscles: { hasSome: tokens } },
                    { secondaryMuscles: { hasSome: tokens } },
                    { equipment: { hasSome: tokens } },
                    { movementPattern: { contains: normalized, mode: "insensitive" } }
                  ]
                }
              ]
            }
          : {})
      },
      take: 80
    });
    let results = exercises
      .map((exercise) => ({
        exercise,
        score: rankSearchCandidate(query, exercise.name, [
          ...exercise.aliases,
          ...exercise.primaryMuscles,
          ...exercise.secondaryMuscles,
          ...exercise.equipment,
          exercise.movementPattern ?? ""
        ])
      }))
      .filter((result) => !normalized || result.score > 0)
      .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
      .slice(0, 30)
      .map((result) => result.exercise);
    if (normalized.length >= 2 && results.length < 20) {
      const imported = await exerciseCatalog.searchAndImport(query, 40);
      const byId = new Map([...results, ...imported].map((exercise) => [exercise.id, exercise]));
      results = [...byId.values()]
        .map((exercise) => ({
          exercise,
          score: rankSearchCandidate(query, exercise.name, [
            ...exercise.aliases,
            ...exercise.primaryMuscles,
            ...exercise.secondaryMuscles,
            ...exercise.equipment,
            exercise.movementPattern ?? ""
          ])
        }))
        .filter((result) => result.score > 0)
        .sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name))
        .slice(0, 30)
        .map((result) => result.exercise);
    }
    res.json({ results });
  })
);

exercisesRouter.post(
  "/custom",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = customExerciseSchema.parse(req.body);
    const exercise = await prisma.exercise.create({
      data: {
        ownerId: userId,
        name: input.name,
        normalizedName: normalizeSearchText(input.name),
        aliases: input.aliases,
        primaryMuscles: input.primaryMuscles,
        secondaryMuscles: input.secondaryMuscles,
        equipment: input.equipment,
        movementPattern: input.movementPattern,
        difficulty: input.difficulty,
        instructions: input.instructions,
        safetyNotes: input.safetyNotes,
        lifecycle: "PUBLISHED",
        submissions: {
          create: {
            userId,
            type: "EXERCISE",
            payload: input,
            verificationState: "USER_SUBMITTED",
            lifecycle: "REVIEW"
          }
        }
      }
    });
    res.status(201).json(exercise);
  })
);
