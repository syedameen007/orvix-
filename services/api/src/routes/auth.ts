import { Router } from "express";
import { prisma } from "@orvix/database";
import { changePasswordSchema, deleteAccountSchema, loginSchema, registerSchema } from "@orvix/validation";
import { asyncHandler, ApiError } from "../errors.js";
import { createSessionToken, hashPassword, verifyPassword } from "../services/authService.js";
import { requireAuth, currentUserId } from "../middleware/auth.js";

export const authRouter = Router();

// Pre-computed bcrypt hash of a random string, used to equalise login timing.
const DUMMY_HASH = "$2a$12$Xq507CNbxo75khimOF/crO/LpXrKS8mQdgAbCa6Cq9QS6Qn1FP.re";

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ApiError(409, "Email is already registered");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(input.password),
        profile: {
          create: {
            name: input.name
          }
        }
      },
      include: { profile: true }
    });

    const session = await createSessionToken(user.id, req.header("user-agent") ?? undefined, req.ip);
    res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: { id: user.id, email: user.email, role: user.role, profile: user.profile }
    });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { profile: true }
    });
    // Always run a bcrypt comparison so response time doesn't reveal whether an email exists.
    const ok = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || user.deletedAt || !user.isActive || !ok) throw new ApiError(401, "Invalid email or password");

    const session = await createSessionToken(user.id, req.header("user-agent") ?? undefined, req.ip);
    res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: { id: user.id, email: user.email, role: user.role, profile: user.profile }
    });
  })
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.authSession.update({
      where: { id: req.user!.sessionId },
      data: { revokedAt: new Date() }
    });
    res.json({ ok: true });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true }
    });
    res.json({ id: user.id, email: user.email, role: user.role, profile: user.profile });
  })
);

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) throw new ApiError(400, "Current password is incorrect");
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(input.newPassword) } });
    // Sign out every other device after a password change.
    await prisma.authSession.updateMany({
      where: { userId, revokedAt: null, NOT: { id: req.user!.sessionId } },
      data: { revokedAt: new Date() }
    });
    res.json({ ok: true });
  })
);

authRouter.get(
  "/export",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const [user, meals, workouts, sessions, weights, measurements, water] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } }),
      prisma.meal.findMany({ where: { userId }, include: { items: true }, orderBy: { date: "asc" } }),
      prisma.workoutTemplate.findMany({ where: { userId }, include: { exercises: true } }),
      prisma.workoutSession.findMany({ where: { userId }, include: { exercises: { include: { sets: true } } } }),
      prisma.weightEntry.findMany({ where: { userId }, orderBy: { measuredAt: "asc" } }),
      prisma.measurementEntry.findMany({ where: { userId } }),
      prisma.waterEntry.findMany({ where: { userId }, orderBy: { date: "asc" } })
    ]);
    res.setHeader("Content-Disposition", 'attachment; filename="orvix-data-export.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email, createdAt: user.createdAt },
      profile: user.profile,
      meals,
      workouts,
      workoutSessions: sessions,
      weights,
      measurements,
      water
    });
  })
);

authRouter.delete(
  "/account",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = deleteAccountSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verifyPassword(input.password, user.passwordHash))) throw new ApiError(400, "Password is incorrect");
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { deletionQueued: true, deletedAt: new Date(), isActive: false } }),
      prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    res.json({ ok: true, message: "Your account has been scheduled for deletion and all sessions were signed out." });
  })
);
