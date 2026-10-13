import type { WorkoutSetInput } from "@orvix/types";
import { randomUUID } from "node:crypto";

export interface WorkoutTemplateExerciseInput {
  templateExerciseId: string;
  exerciseId: string;
  order: number;
  targetSets?: number | null;
  notes?: string | null;
}

export interface StartedSessionExercise {
  sessionExerciseId: string;
  exerciseId: string;
  order: number;
  previousSessionSets: WorkoutSetInput[];
  sets: WorkoutSetInput[];
}

export interface StartedWorkoutSession {
  sessionId: string;
  workoutTemplateId: string;
  startedAt: Date;
  exercises: StartedSessionExercise[];
}

export function createWorkoutSessionSnapshot(
  workoutTemplateId: string,
  exercises: WorkoutTemplateExerciseInput[],
  previousPerformance: Record<string, WorkoutSetInput[]> = {},
  now = new Date()
): StartedWorkoutSession {
  return {
    sessionId: randomUUID(),
    workoutTemplateId,
    startedAt: now,
    exercises: [...exercises]
      .sort((a, b) => a.order - b.order)
      .map((exercise) => ({
        sessionExerciseId: randomUUID(),
        exerciseId: exercise.exerciseId,
        order: exercise.order,
        previousSessionSets: structuredClone(previousPerformance[exercise.exerciseId] ?? []),
        sets: []
      }))
  };
}

export function appendWorkoutSet(existingSets: WorkoutSetInput[], next: Omit<WorkoutSetInput, "setNumber">): WorkoutSetInput[] {
  return [
    ...structuredClone(existingSets),
    {
      ...next,
      setNumber: existingSets.length + 1,
      setType: next.setType ?? "WORKING"
    }
  ];
}
