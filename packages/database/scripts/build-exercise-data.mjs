#!/usr/bin/env node
/* global process, fetch, console */
/**
 * Builds prisma/data/exercises.json from the public-domain "Free Exercise DB"
 * (https://github.com/yuhonas/free-exercise-db, Unlicense).
 *
 * Usage:  node scripts/build-exercise-data.mjs [path-to-exercises.json]
 * Without an argument the file is downloaded from GitHub.
 *
 * Choices made for a beginner-first app:
 *  - drop strongman and Olympic-lifting movements (technical, injury-prone for novices)
 *  - drop entries without instructions
 *  - add muscle-group aliases (legs/back/arms/core/abs) so the app's quick filters match
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const MEDIA = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
const out = join(dirname(fileURLToPath(import.meta.url)), "../prisma/data/exercises.json");

const GROUPS = {
  legs: ["quadriceps", "hamstrings", "calves", "glutes", "adductors", "abductors"],
  back: ["lats", "middle back", "lower back", "traps"],
  arms: ["biceps", "triceps", "forearms"],
  core: ["abdominals"]
};
const EXTRA_ALIAS = { abdominals: ["abs"], quadriceps: ["quads"], shoulders: ["delts"], "body only": ["bodyweight"] };
const SKIP_CATEGORIES = new Set(["strongman", "olympic weightlifting"]);
const LEVEL = { beginner: "beginner", intermediate: "intermediate", expert: "advanced" };

const raw = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : await (await fetch(SOURCE)).json();

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const exercises = raw
  .filter((item) => item.instructions?.length && !SKIP_CATEGORIES.has(item.category))
  .map((item) => {
    const aliases = new Set();
    for (const muscle of item.primaryMuscles) {
      for (const [group, members] of Object.entries(GROUPS)) if (members.includes(muscle)) aliases.add(group);
      for (const alias of EXTRA_ALIAS[muscle] ?? []) aliases.add(alias);
    }
    if (item.equipment) for (const alias of EXTRA_ALIAS[item.equipment] ?? []) aliases.add(alias);
    if (item.category === "stretching") aliases.add("stretch");
    if (item.category === "cardio") aliases.add("cardio");
    return {
      sourceId: item.id,
      name: item.name,
      normalizedName: normalize(item.name),
      aliases: [...aliases].sort(),
      primaryMuscles: item.primaryMuscles,
      secondaryMuscles: item.secondaryMuscles,
      equipment: item.equipment ? [item.equipment === "body only" ? "bodyweight" : item.equipment] : [],
      movementPattern: item.force ?? item.category,
      difficulty: LEVEL[item.level] ?? "beginner",
      category: item.category,
      instructions: item.instructions.map((step, index) => `${index + 1}. ${step.trim()}`).join("\n"),
      mediaUrl: item.images?.[0] ? `${MEDIA}/${item.id}/${item.images[0].split("/").pop()}` : null
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(out, JSON.stringify(exercises));
console.log(`Wrote ${exercises.length} exercises (${raw.length - exercises.length} excluded) to ${out}`);
