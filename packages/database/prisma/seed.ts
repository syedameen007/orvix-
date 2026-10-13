import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FOOD_SOURCE, buildExerciseRecords, buildFoodRecords } from "./data/records.js";

const prisma = new PrismaClient();
const CHUNK = 200;
const isProduction = process.env.NODE_ENV === "production";

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "admin@orvix.local";
  const password = process.env.ADMIN_PASSWORD;

  if (isProduction && (!password || password.length < 12 || password === "change-me-before-production")) {
    throw new Error("Refusing to seed in production: set ADMIN_PASSWORD to a unique password of 12+ characters.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  const admin =
    existing ??
    (await prisma.user.create({
      data: { email, passwordHash: await bcrypt.hash(password ?? "change-me-before-production", 12), role: UserRole.ADMIN }
    }));
  if (existing && existing.role !== UserRole.ADMIN) await prisma.user.update({ where: { id: existing.id }, data: { role: UserRole.ADMIN } });

  // Admin accounts should never be dropped into the consumer onboarding flow.
  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: { onboardingCompleted: true },
    create: { userId: admin.id, name: "ORVIX Admin", onboardingCompleted: true }
  });
  return { admin, created: !existing };
}

async function seedFoods() {
  const source =
    (await prisma.foodSource.findFirst({ where: { name: FOOD_SOURCE.name } })) ??
    (await prisma.foodSource.create({ data: { ...FOOD_SOURCE, retrievedAt: new Date() } }));

  const records = buildFoodRecords(source.id);
  const existing = await prisma.food.findMany({ where: { ownerId: null, sourceId: source.id }, select: { id: true, name: true } });
  const idByName = new Map(existing.map((food) => [food.name, food.id]));

  const toCreate = records.filter((record) => !idByName.has(record.name));
  const toUpdate = records.filter((record) => idByName.has(record.name));

  for (const batch of chunk(toCreate, CHUNK)) await prisma.food.createMany({ data: batch });
  for (const batch of chunk(toUpdate, 25)) {
    await Promise.all(batch.map((record) => prisma.food.update({ where: { id: idByName.get(record.name)! }, data: record })));
  }

  // Retire the old 9-item development sample so it no longer shows up in search.
  const retired = await prisma.food.updateMany({
    where: { ownerId: null, source: { name: "ORVIX SAMPLE / DEVELOPMENT DATA" }, lifecycle: "PUBLISHED" },
    data: { lifecycle: "DEPRECATED" }
  });

  return { created: toCreate.length, updated: toUpdate.length, retired: retired.count };
}

async function seedExercises() {
  const records = buildExerciseRecords();
  const existing = await prisma.exercise.findMany({ where: { ownerId: null }, select: { id: true, normalizedName: true } });
  const idByName = new Map(existing.map((exercise) => [exercise.normalizedName, exercise.id]));

  const toCreate = records.filter((record) => !idByName.has(record.normalizedName));
  const toUpdate = records.filter((record) => idByName.has(record.normalizedName));

  for (const batch of chunk(toCreate, CHUNK)) await prisma.exercise.createMany({ data: batch });
  for (const batch of chunk(toUpdate, 25)) {
    await Promise.all(batch.map((record) => prisma.exercise.update({ where: { id: idByName.get(record.normalizedName)! }, data: record })));
  }

  const retired = await prisma.exercise.updateMany({
    where: { ownerId: null, instructions: { startsWith: "SAMPLE / DEVELOPMENT DATA" }, lifecycle: "PUBLISHED" },
    data: { lifecycle: "DEPRECATED" }
  });

  return { created: toCreate.length, updated: toUpdate.length, retired: retired.count };
}

async function main() {
  const { admin, created } = await seedAdmin();
  const foods = await seedFoods();
  const exercises = await seedExercises();

  await prisma.auditLog.create({
    data: { userId: admin.id, action: "SEED_DATA", entity: "SYSTEM", metadata: { source: FOOD_SOURCE.name, foods, exercises } }
  });

  console.log(`Admin:      ${created ? "created" : "already existed"} (${admin.email})`);
  console.log(`Foods:      ${foods.created} created, ${foods.updated} updated, ${foods.retired} old sample foods retired`);
  console.log(`Exercises:  ${exercises.created} created, ${exercises.updated} updated, ${exercises.retired} old sample exercises retired`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
