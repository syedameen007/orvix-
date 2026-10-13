import { Router } from "express";
import { prisma } from "@orvix/database";
import { waterEntrySchema } from "@orvix/validation";
import { asyncHandler } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";

export const waterRouter = Router();
waterRouter.use(requireAuth);

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

waterRouter.get(
  "/daily",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const date = typeof req.query.date === "string" ? req.query.date : new Date().toISOString().slice(0, 10);
    const { start, end } = dayRange(date);
    const entries = await prisma.waterEntry.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: { createdAt: "asc" } });
    res.json({ date, totalMl: entries.reduce((sum, entry) => sum + entry.amountMl, 0), entries });
  })
);

waterRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = waterEntrySchema.parse(req.body);
    const date = input.date ?? new Date().toISOString().slice(0, 10);
    const entry = await prisma.waterEntry.create({ data: { userId, date: dayRange(date).start, amountMl: input.amountMl } });
    res.status(201).json(entry);
  })
);

waterRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    await prisma.waterEntry.deleteMany({ where: { id: String(req.params.id), userId } });
    res.status(204).end();
  })
);
