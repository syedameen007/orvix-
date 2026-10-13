import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { prisma } from "@orvix/database";
import { env } from "../env.js";
import { hashToken } from "../middleware/auth.js";

function expiresAtFromNow(): Date {
  const days = env.JWT_EXPIRES_IN.endsWith("d") ? Number.parseInt(env.JWT_EXPIRES_IN, 10) : 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (Number.isFinite(days) ? days : 7));
  return expiresAt;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string, userAgent?: string, ipAddress?: string) {
  const expiresAt = expiresAtFromNow();
  const placeholder = crypto.randomBytes(32).toString("hex");
  const session = await prisma.authSession.create({
    data: {
      userId,
      tokenHash: placeholder,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
      expiresAt
    }
  });
  const token = jwt.sign({ sub: userId, sessionId: session.id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  });
  await prisma.authSession.update({
    where: { id: session.id },
    data: { tokenHash: hashToken(token) }
  });
  return { token, expiresAt };
}
