import { Router } from "express";
import { prisma } from "@orvix/database";
import { aiChatSchema } from "@orvix/validation";
import { asyncHandler } from "../errors.js";
import { currentUserId, requireAuth } from "../middleware/auth.js";
import { AiProvider } from "../services/providerServices.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);

const aiProvider = new AiProvider();

aiRouter.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const input = aiChatSchema.parse(req.body);
    const [profile, recentMeals, recentSessions, latestProgress] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId } }),
      prisma.meal.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 10, include: { items: true } }),
      prisma.workoutSession.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        take: 10,
        include: { exercises: { include: { exercise: true, sets: true } } }
      }),
      prisma.weightEntry.findMany({ where: { userId }, orderBy: { measuredAt: "desc" }, take: 10 })
    ]);

    const context = {
      profile,
      recentMeals,
      recentSessions,
      latestProgress,
      policy: "Use only retrieved ORVIX user data. Do not fabricate history. Label estimates clearly."
    };
    const conversation = await prisma.aiConversation.create({
      data: {
        userId,
        title: input.message.slice(0, 80),
        messages: {
          create: {
            role: "user",
            content: input.message,
            retrievedContext: context
          }
        }
      }
    });

    const result = await aiProvider.chat(input.message, context);
    if (result.data?.text) {
      await prisma.aiMessage.create({
        data: {
          aiConversationId: conversation.id,
          role: "assistant",
          content: result.data.text,
          retrievedContext: context
        }
      });
    }

    res.status(result.configured ? 202 : 501).json({
      conversationId: conversation.id,
      result,
      contextSummary: {
        hasProfile: Boolean(profile),
        mealCount: recentMeals.length,
        workoutSessionCount: recentSessions.length,
        progressEntryCount: latestProgress.length
      }
    });
  })
);

aiRouter.get(
  "/conversations",
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const conversations = await prisma.aiConversation.findMany({
      where: { userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 50
    });
    res.json({ conversations });
  })
);
