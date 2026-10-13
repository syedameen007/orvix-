import { Router } from "express";
import { prisma } from "@orvix/database";
import { programSchema } from "@orvix/validation";
import { asyncHandler, ApiError } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";

export const programsRouter = Router();
programsRouter.use(requireAuth);

programsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const programs = await prisma.trainingProgram.findMany({
      where: { userId, archivedAt: null },
      include: { days: { include: { workoutTemplate: true }, orderBy: { order: "asc" } } },
      orderBy: { updatedAt: "desc" }
    });
    res.json({ programs });
  })
);

programsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = programSchema.parse(req.body);
    const workoutIds = input.days.map((day) => day.workoutTemplateId).filter((id): id is string => Boolean(id));
    if (workoutIds.length) {
      const count = await prisma.workoutTemplate.count({
        where: { id: { in: workoutIds }, userId }
      });
      if (count !== new Set(workoutIds).size) throw new ApiError(404, "One or more workouts were not found");
    }

    const program = await prisma.trainingProgram.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        days: {
          create: input.days.map((day) => ({
            name: day.name,
            order: day.order,
            workoutTemplateId: day.workoutTemplateId,
            notes: day.notes
          }))
        }
      },
      include: { days: { include: { workoutTemplate: true }, orderBy: { order: "asc" } } }
    });
    res.status(201).json(program);
  })
);

programsRouter.post(
  "/:id/duplicate",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const program = await prisma.trainingProgram.findFirst({
      where: { id: req.params.id, userId },
      include: { days: true }
    });
    if (!program) throw new ApiError(404, "Program not found");
    const duplicated = await prisma.trainingProgram.create({
      data: {
        userId,
        name: String(req.body.name ?? `${program.name} Copy`),
        description: program.description,
        days: {
          create: program.days.map((day) => ({
            name: day.name,
            order: day.order,
            workoutTemplateId: day.workoutTemplateId,
            notes: day.notes
          }))
        }
      },
      include: { days: { include: { workoutTemplate: true }, orderBy: { order: "asc" } } }
    });
    res.status(201).json(duplicated);
  })
);

programsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const updated = await prisma.trainingProgram.updateMany({
      where: { id: req.params.id, userId },
      data: {
        name: typeof req.body.name === "string" ? req.body.name : undefined,
        description: typeof req.body.description === "string" ? req.body.description : undefined,
        archivedAt: req.body.archived === true ? new Date() : undefined
      }
    });
    if (updated.count === 0) throw new ApiError(404, "Program not found");
    res.json({ ok: true });
  })
);

programsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    await prisma.trainingProgram.deleteMany({ where: { id: req.params.id, userId } });
    res.json({ ok: true });
  })
);
