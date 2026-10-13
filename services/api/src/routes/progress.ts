import { Router } from "express";
import { prisma } from "@orvix/database";
import { progressWeightSchema } from "@orvix/validation";
import { z } from "zod";
import { asyncHandler } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";

export const progressRouter = Router();
progressRouter.use(requireAuth);

const measurementSchema = z.object({
  measuredAt: z.string().datetime().optional(),
  location: z.string().min(1).max(120),
  valueCm: z.number().positive(),
  notes: z.string().max(1000).nullable().optional()
});

const photoSchema = z.object({
  capturedAt: z.string().datetime().optional(),
  fileUrl: z.string().url(),
  pose: z.string().max(80).nullable().optional(),
  notes: z.string().max(1000).nullable().optional()
});

progressRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const [weights, measurements, photos] = await Promise.all([
      prisma.weightEntry.findMany({ where: { userId }, orderBy: { measuredAt: "desc" }, take: 100 }),
      prisma.measurementEntry.findMany({ where: { userId }, orderBy: { measuredAt: "desc" }, take: 100 }),
      prisma.progressPhoto.findMany({ where: { userId }, orderBy: { capturedAt: "desc" }, take: 50 })
    ]);
    res.json({ weights, measurements, photos });
  })
);

progressRouter.post(
  "/weight",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = progressWeightSchema.parse(req.body);
    const entry = await prisma.weightEntry.create({
      data: {
        userId,
        weightKg: input.weightKg,
        measuredAt: input.measuredAt ? new Date(input.measuredAt) : undefined,
        notes: input.notes
      }
    });
    await prisma.userProfile.update({ where: { userId }, data: { currentWeightKg: input.weightKg } });
    res.status(201).json(entry);
  })
);

progressRouter.post(
  "/measurements",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = measurementSchema.parse(req.body);
    const entry = await prisma.measurementEntry.create({
      data: {
        userId,
        location: input.location,
        valueCm: input.valueCm,
        measuredAt: input.measuredAt ? new Date(input.measuredAt) : undefined,
        notes: input.notes
      }
    });
    res.status(201).json(entry);
  })
);

progressRouter.post(
  "/photos",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = photoSchema.parse(req.body);
    const photo = await prisma.progressPhoto.create({
      data: {
        userId,
        fileUrl: input.fileUrl,
        capturedAt: input.capturedAt ? new Date(input.capturedAt) : undefined,
        pose: input.pose,
        notes: input.notes
      }
    });
    res.status(201).json(photo);
  })
);
