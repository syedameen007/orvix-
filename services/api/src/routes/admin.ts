import { Router } from "express";
import { prisma } from "@orvix/database";
import { z } from "zod";
import { asyncHandler, ApiError } from "../errors.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

const lifecycleSchema = z.object({
  lifecycle: z.enum(["DRAFT", "REVIEW", "VERIFIED", "PUBLISHED", "DEPRECATED"]).optional(),
  verificationState: z
    .enum(["MANUFACTURER_VERIFIED", "OFFICIAL_SOURCE", "LICENSED_DATA", "OPEN_DATA", "USER_SUBMITTED", "AI_ESTIMATED", "UNVERIFIED"])
    .optional(),
  notes: z.string().max(1000).optional()
});

adminRouter.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [users, foodsInReview, exercises, submissions] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.food.count({ where: { lifecycle: "REVIEW" } }),
      prisma.exercise.count(),
      prisma.dataSubmission.count({ where: { lifecycle: "REVIEW" } })
    ]);
    res.json({ users, foodsInReview, exercises, submissions });
  })
);

adminRouter.get(
  "/foods",
  asyncHandler(async (req, res) => {
    const lifecycle = typeof req.query.lifecycle === "string" ? req.query.lifecycle : undefined;
    const foods = await prisma.food.findMany({
      where: lifecycle ? { lifecycle: lifecycle as any } : {},
      include: { brand: true, source: true, owner: { select: { id: true, email: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100
    });
    res.json({ foods });
  })
);

adminRouter.patch(
  "/foods/:id",
  asyncHandler(async (req, res) => {
    const input = lifecycleSchema.parse(req.body);
    const food = await prisma.food.findUnique({ where: { id: req.params.id } });
    if (!food) throw new ApiError(404, "Food not found");
    const updated = await prisma.food.update({
      where: { id: food.id },
      data: {
        lifecycle: input.lifecycle,
        verificationState: input.verificationState,
        notes: input.notes ?? food.notes
      }
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "ADMIN_UPDATE_FOOD",
        entity: "Food",
        entityId: food.id,
        metadata: input
      }
    });
    res.json(updated);
  })
);

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        deletionQueued: true,
        createdAt: true,
        profile: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    res.json({ users });
  })
);
