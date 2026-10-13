import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { foodsRouter } from "./routes/foods.js";
import { mealsRouter } from "./routes/meals.js";
import { recipesRouter } from "./routes/recipes.js";
import { exercisesRouter } from "./routes/exercises.js";
import { workoutsRouter } from "./routes/workouts.js";
import { programsRouter } from "./routes/programs.js";
import { progressRouter } from "./routes/progress.js";
import { waterRouter } from "./routes/water.js";
import { scannerRouter } from "./routes/scanner.js";
import { aiRouter } from "./routes/ai.js";
import { adminRouter } from "./routes/admin.js";
import { errorHandler, notFound } from "./errors.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Non-browser clients (curl, native apps) send no Origin header.
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        // In development, allow any localhost origin so Vite dev servers just work.
        if (!env.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        return callback(null, false);
      },
      maxAge: 600
    })
  );
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("tiny"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "orvix-api" });
  });

  app.use(
    "/auth/login",
    rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many attempts. Please try again in a few minutes." } })
  );
  app.use(
    "/auth/register",
    rateLimit({ windowMs: 60 * 60_000, limit: 15, standardHeaders: "draft-7", legacyHeaders: false, message: { error: "Too many sign-ups from this network. Please try again later." } })
  );
  app.use("/auth", authRouter);
  app.use("/profile", profileRouter);
  app.use("/foods", foodsRouter);
  app.use("/meals", mealsRouter);
  app.use("/recipes", recipesRouter);
  app.use("/exercises", exercisesRouter);
  app.use("/workouts", workoutsRouter);
  app.use("/programs", programsRouter);
  app.use("/progress", progressRouter);
  app.use("/water", waterRouter);
  app.use("/scanner", scannerRouter);
  app.use("/ai", aiRouter);
  app.use("/admin", adminRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
