import { Router } from "express";
import type { Prisma } from "@orvix/database";
import { prisma } from "@orvix/database";
import { onboardingSchema, profileUpdateSchema } from "@orvix/validation";
import { calculateDailyTargets } from "@orvix/utils";
import { asyncHandler } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const profile = await prisma.userProfile.findUniqueOrThrow({ where: { userId } });
    res.json(profile);
  })
);

profileRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = profileUpdateSchema.parse(req.body);
    const data = input as Prisma.UserProfileUncheckedUpdateInput;
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        ...(input as Prisma.UserProfileUncheckedCreateInput),
        userId,
        name: input.name ?? "ORVIX Athlete"
      },
      update: data
    });
    res.json(profile);
  })
);

profileRouter.post(
  "/onboard",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = onboardingSchema.parse(req.body);
    const targets = calculateDailyTargets({
      sex: input.sex,
      age: input.age,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      activityLevel: input.activityLevel,
      goal: input.goal
    });
    const data = {
      name: input.name,
      sex: input.sex,
      age: input.age,
      heightCm: input.heightCm,
      currentWeightKg: input.weightKg,
      startingWeightKg: input.weightKg,
      targetWeightKg: input.targetWeightKg ?? null,
      primaryGoal: input.goal,
      activityLevel: input.activityLevel,
      trainingExperience: input.trainingExperience,
      dietPreference: input.dietPreference ?? null,
      calorieTarget: targets.calories,
      proteinTargetG: targets.proteinG,
      carbTargetG: targets.carbsG,
      fatTargetG: targets.fatG,
      fiberTargetG: targets.fiberG,
      waterTargetMl: targets.waterMl,
      onboardingCompleted: true
    };
    const profile = await prisma.userProfile.upsert({ where: { userId }, create: { ...data, userId }, update: data });
    await prisma.weightEntry.create({ data: { userId, weightKg: input.weightKg, notes: "Starting weight" } });
    res.json({ profile, targets });
  })
);
