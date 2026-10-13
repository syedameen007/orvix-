import { afterEach, describe, expect, it, vi } from "vitest";

/** Minimal in-memory stand-in for the parts of PrismaClient the seed script uses. */
const db = vi.hoisted(() => {
  type Row = Record<string, unknown> & { id: string };
  const tables: Record<string, Row[]> = { user: [], userProfile: [], foodSource: [], food: [], exercise: [], auditLog: [] };
  let counter = 0;
  const nextId = () => `id${++counter}`;
  const insert = (table: string, data: Record<string, unknown>) => {
    const row = { ...data, id: nextId() } as Row;
    tables[table]!.push(row);
    return row;
  };
  const model = (table: string) => ({
    findMany: async () => tables[table]!.map((row) => ({ ...row })),
    findFirst: async ({ where }: { where: Record<string, unknown> }) => tables[table]!.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
    findUnique: async ({ where }: { where: Record<string, unknown> }) => tables[table]!.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
    create: async ({ data }: { data: Record<string, unknown> }) => insert(table, data),
    createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
      data.forEach((row) => insert(table, row));
      return { count: data.length };
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = tables[table]!.find((candidate) => candidate.id === where.id)!;
      Object.assign(row, data);
      return row;
    },
    updateMany: async () => ({ count: 0 }),
    upsert: async ({ where, update, create }: { where: Record<string, unknown>; update: Record<string, unknown>; create: Record<string, unknown> }) => {
      const found = tables[table]!.find((row) => Object.entries(where).every(([key, value]) => row[key] === value));
      if (found) return Object.assign(found, update);
      return insert(table, create);
    }
  });
  return { tables, model, reset: () => Object.values(tables).forEach((rows) => (rows.length = 0)) };
});

vi.mock("../packages/database/node_modules/@prisma/client", () => ({
  UserRole: { ADMIN: "ADMIN", USER: "USER" },
  PrismaClient: class {
    user = db.model("user");
    userProfile = db.model("userProfile");
    foodSource = db.model("foodSource");
    food = db.model("food");
    exercise = db.model("exercise");
    auditLog = db.model("auditLog");
    $disconnect = async () => undefined;
  }
}));

async function runSeed() {
  vi.resetModules();
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  await import("../packages/database/prisma/seed.js");
  await new Promise((resolve) => setTimeout(resolve, 1500)); // bcrypt + async main
  const lines = log.mock.calls.map((call) => String(call[0]));
  log.mockRestore();
  return lines;
}

describe("seed script (against an in-memory database)", () => {
  afterEach(() => {
    db.reset();
    vi.unstubAllEnvs();
  });

  it("populates foods and exercises, then is idempotent on a second run", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "a-unique-dev-password");
    const first = await runSeed();
    const foodCount = db.tables.food!.length;
    const exerciseCount = db.tables.exercise!.length;
    expect(foodCount).toBeGreaterThanOrEqual(190);
    expect(exerciseCount).toBeGreaterThanOrEqual(700);
    expect(first.join("\n")).toMatch(new RegExp(`Foods:\\s+${foodCount} created, 0 updated`));
    expect(db.tables.user!.filter((user) => user.role === "ADMIN")).toHaveLength(1);
    expect(db.tables.userProfile![0]!.onboardingCompleted).toBe(true);

    const second = await runSeed();
    expect(db.tables.food!.length).toBe(foodCount);
    expect(db.tables.exercise!.length).toBe(exerciseCount);
    expect(db.tables.user!.length).toBe(1);
    expect(db.tables.foodSource!.length).toBe(1);
    expect(second.join("\n")).toMatch(new RegExp(`Foods:\\s+0 created, ${foodCount} updated`));
  }, 30_000);

  it("refuses to seed production with a missing or weak admin password", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_PASSWORD", "change-me-before-production");
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await runSeed();
    expect(exit).toHaveBeenCalledWith(1);
    expect(String(error.mock.calls[0]?.[0])).toMatch(/ADMIN_PASSWORD/);
    expect(db.tables.food!.length).toBe(0);
    exit.mockRestore();
    error.mockRestore();
  }, 30_000);
});
