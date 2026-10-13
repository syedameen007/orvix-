import { describe, expect, it } from "vitest";
import { appendWorkoutSet, createWorkoutSessionSnapshot } from "../packages/utils/src/workout.js";

describe("workout session history", () => {
  it("keeps separate workout sessions immutable", () => {
    const template = [
      {
        templateExerciseId: "template-bench",
        exerciseId: "bench",
        order: 0
      }
    ];

    const session1 = createWorkoutSessionSnapshot("workout-1", template, {}, new Date("2026-01-01T10:00:00Z"));
    let session1Sets = session1.exercises[0]!.sets;
    session1Sets = appendWorkoutSet(session1Sets, { weight: 60, weightUnit: "kg", reps: 12 });
    session1Sets = appendWorkoutSet(session1Sets, { weight: 65, weightUnit: "kg", reps: 10 });
    session1Sets = appendWorkoutSet(session1Sets, { weight: 67.5, weightUnit: "kg", reps: 8 });

    const previous = { bench: session1Sets };
    const session2 = createWorkoutSessionSnapshot("workout-1", template, previous, new Date("2026-01-08T10:00:00Z"));
    let session2Sets = session2.exercises[0]!.sets;
    session2Sets = appendWorkoutSet(session2Sets, { weight: 62.5, weightUnit: "kg", reps: 11 });
    session2Sets = appendWorkoutSet(session2Sets, { weight: 67.5, weightUnit: "kg", reps: 9 });
    session2Sets = appendWorkoutSet(session2Sets, { weight: 70, weightUnit: "kg", reps: 7 });

    expect(session1.exercises[0]!.sets).toEqual([]);
    expect(session2.exercises[0]!.previousSessionSets).toEqual(session1Sets);
    expect(session2Sets).toEqual([
      expect.objectContaining({ setNumber: 1, weight: 62.5, reps: 11 }),
      expect.objectContaining({ setNumber: 2, weight: 67.5, reps: 9 }),
      expect.objectContaining({ setNumber: 3, weight: 70, reps: 7 })
    ]);
    expect(session1Sets).toEqual([
      expect.objectContaining({ setNumber: 1, weight: 60, reps: 12 }),
      expect.objectContaining({ setNumber: 2, weight: 65, reps: 10 }),
      expect.objectContaining({ setNumber: 3, weight: 67.5, reps: 8 })
    ]);
  });
});
