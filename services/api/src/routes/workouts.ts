import { Router } from "express";
import { prisma } from "@orvix/database";
import { STARTER_ROUTINES } from "@orvix/utils";
import { workoutSetSchema, workoutTemplateSchema } from "@orvix/validation";
import { asyncHandler, ApiError } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";

export const workoutsRouter = Router();
workoutsRouter.use(requireAuth);

workoutsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const workouts = await prisma.workoutTemplate.findMany({
      where: { userId, archivedAt: null },
      include: {
        category: true,
        exercises: { include: { exercise: true }, orderBy: { order: "asc" } },
        _count: { select: { sessions: true } }
      },
      orderBy: { updatedAt: "desc" }
    });
    res.json({ workouts });
  })
);

workoutsRouter.get("/starters", (_req, res) => {
  res.json({
    routines: STARTER_ROUTINES.map((routine) => ({
      key: routine.key,
      name: routine.name,
      level: routine.level,
      daysPerWeek: routine.daysPerWeek,
      equipment: routine.equipment,
      summary: routine.summary,
      exercises: routine.exercises
    }))
  });
});

// Adds a ready-made routine to the user's workouts. Idempotent: adding it twice returns the existing one.
workoutsRouter.post(
  "/starters/:key",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const routine = STARTER_ROUTINES.find((candidate) => candidate.key === req.params.key);
    if (!routine) throw new ApiError(404, "Routine not found");

    const existing = await prisma.workoutTemplate.findFirst({
      where: { userId, name: routine.name, archivedAt: null },
      include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } }
    });
    if (existing) return res.json(existing);

    const names = routine.exercises.map((exercise) => exercise.name);
    const library = await prisma.exercise.findMany({ where: { ownerId: null, lifecycle: "PUBLISHED", name: { in: names } }, select: { id: true, name: true } });
    const idByName = new Map(library.map((exercise) => [exercise.name, exercise.id]));
    const missing = names.filter((name) => !idByName.has(name));
    if (missing.length) throw new ApiError(409, "The exercise library isn't fully loaded yet. Please try again later.");

    const category = await prisma.workoutCategory.upsert({
      where: { userId_name: { userId, name: "Starter routines" } },
      update: {},
      create: { userId, name: "Starter routines" }
    });

    const workout = await prisma.workoutTemplate.create({
      data: {
        userId,
        categoryId: category.id,
        name: routine.name,
        notes: routine.summary,
        exercises: {
          create: routine.exercises.map((exercise, order) => ({
            exerciseId: idByName.get(exercise.name)!,
            order,
            targetSets: exercise.sets,
            notes: `${exercise.sets} sets of ${exercise.reps}. Rest ${exercise.restSec}s.`
          }))
        }
      },
      include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } }
    });
    res.status(201).json(workout);
  })
);

workoutsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = workoutTemplateSchema.parse(req.body);
    const category = input.categoryName
      ? await prisma.workoutCategory.upsert({
          where: { userId_name: { userId, name: input.categoryName } },
          update: {},
          create: { userId, name: input.categoryName }
        })
      : null;

    const exerciseIds = [...new Set(input.exercises.map((exercise) => exercise.exerciseId))];
    if (exerciseIds.length) {
      const count = await prisma.exercise.count({
        where: { id: { in: exerciseIds }, OR: [{ ownerId: null }, { ownerId: userId }] }
      });
      if (count !== exerciseIds.length) throw new ApiError(404, "One or more exercises were not found");
    }

    const workout = await prisma.workoutTemplate.create({
      data: {
        userId,
        categoryId: category?.id,
        name: input.name,
        notes: input.notes,
        exercises: {
          create: input.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            order: exercise.order,
            targetSets: exercise.targetSets,
            notes: exercise.notes
          }))
        }
      },
      include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } }, category: true }
    });
    res.status(201).json(workout);
  })
);

workoutsRouter.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const workout = await prisma.workoutTemplate.findFirst({
      where: { id: req.params.id, userId },
      include: { exercises: true }
    });
    if (!workout) throw new ApiError(404, "Workout not found");
    const duplicated = await prisma.workoutTemplate.create({
      data: {
        userId,
        categoryId: workout.categoryId,
        name: String(req.body.name ?? `${workout.name} Copy`),
        notes: workout.notes,
        exercises: {
          create: workout.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            order: exercise.order,
            targetSets: exercise.targetSets,
            notes: exercise.notes
          }))
        }
      },
      include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } }
    });
    res.status(201).json(duplicated);
  })
);

workoutsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const workout = await prisma.workoutTemplate.updateMany({
      where: { id: req.params.id, userId },
      data: {
        name: typeof req.body.name === "string" ? req.body.name : undefined,
        notes: typeof req.body.notes === "string" ? req.body.notes : undefined,
        isFavorite: typeof req.body.isFavorite === "boolean" ? req.body.isFavorite : undefined,
        archivedAt: req.body.archived === true ? new Date() : undefined
      }
    });
    if (workout.count === 0) throw new ApiError(404, "Workout not found");
    res.json({ ok: true });
  })
);

workoutsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    await prisma.workoutTemplate.deleteMany({ where: { id: req.params.id, userId } });
    res.json({ ok: true });
  })
);

workoutsRouter.post(
  "/:id/start",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const template = await prisma.workoutTemplate.findFirst({
      where: { id: req.params.id, userId },
      include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } }
    });
    if (!template) throw new ApiError(404, "Workout not found");

    const previous = await prisma.workoutSession.findFirst({
      where: { userId, workoutTemplateId: template.id, status: "COMPLETED" },
      orderBy: { startedAt: "desc" },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: "asc" } }
          },
          orderBy: { order: "asc" }
        }
      }
    });

    const session = await prisma.workoutSession.create({
      data: {
        userId,
        workoutTemplateId: template.id,
        name: template.name,
        exercises: {
          create: template.exercises.map((item) => ({
            exerciseId: item.exerciseId,
            order: item.order,
            notes: item.notes
          }))
        }
      },
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: { orderBy: { setNumber: "asc" } }
          },
          orderBy: { order: "asc" }
        }
      }
    });

    res.status(201).json({
      session,
      previousPerformance:
        previous?.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exercise.name,
          sets: exercise.sets
        })) ?? []
    });
  })
);

workoutsRouter.post(
  "/sessions/:sessionExerciseId/sets",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = workoutSetSchema.parse(req.body);
    const sessionExercise = await prisma.workoutSessionExercise.findFirst({
      where: { id: req.params.sessionExerciseId, workoutSession: { userId, status: "IN_PROGRESS" } },
      include: { sets: true }
    });
    if (!sessionExercise) throw new ApiError(404, "Session exercise not found");

    const set = await prisma.workoutSet.create({
      data: {
        workoutSessionExerciseId: sessionExercise.id,
        setNumber: sessionExercise.sets.length + 1,
        weight: input.weight,
        weightUnit: input.weightUnit,
        reps: input.reps,
        rpe: input.rpe,
        rir: input.rir,
        durationSeconds: input.durationSeconds,
        distance: input.distance,
        distanceUnit: input.distanceUnit,
        restSeconds: input.restSeconds,
        setType: input.setType,
        notes: input.notes
      }
    });
    res.status(201).json(set);
  })
);

workoutsRouter.post(
  "/sessions/:sessionId/complete",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const session = await prisma.workoutSession.updateMany({
      where: { id: req.params.sessionId, userId },
      data: { status: "COMPLETED", completedAt: new Date(), notes: req.body.notes }
    });
    if (session.count === 0) throw new ApiError(404, "Workout session not found");
    res.json({ ok: true });
  })
);

workoutsRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const sessions = await prisma.workoutSession.findMany({
      where: { userId },
      include: {
        exercises: {
          include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } },
          orderBy: { order: "asc" }
        }
      },
      orderBy: { startedAt: "desc" },
      take: 50
    });
    res.json({ sessions });
  })
);
