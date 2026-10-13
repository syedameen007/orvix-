import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "@orvix/database";
import { env } from "../env.js";
import { ApiError } from "../errors.js";

interface JwtPayload {
  sub: string;
  sessionId: string;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) return next(new ApiError(401, "Authentication required"));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const tokenHash = hashToken(token);
    const session = await prisma.authSession.findFirst({
      where: {
        id: payload.sessionId,
        tokenHash,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!session || session.revokedAt || session.user.id !== payload.sub || !session.user.isActive || session.user.deletedAt) {
      return next(new ApiError(401, "Invalid or expired session"));
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.id
    };
    return next();
  } catch {
    return next(new ApiError(401, "Invalid or expired session"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") return next(new ApiError(403, "Admin access required"));
  return next();
}

export function currentUserId(req: Request): string {
  if (!req.user?.id) throw new ApiError(401, "Authentication required");
  return req.user.id;
}
