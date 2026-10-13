/**
 * Ready-made beginner routines. Exercise names must match packages/database/prisma/data/exercises.json exactly
 * (enforced by tests/seed-data.test.ts). General guidance only, not medical advice.
 */
export interface StarterExercise {
  name: string;
  sets: number;
  /** Reps like "8-12", or a duration like "20-40 sec". */
  reps: string;
  restSec: number;
}

export interface StarterRoutine {
  key: string;
  name: string;
  level: "beginner" | "intermediate";
  daysPerWeek: number;
  equipment: "none" | "dumbbells" | "gym";
  summary: string;
  exercises: StarterExercise[];
}

export const STARTER_ROUTINES: StarterRoutine[] = [
  {
    key: "full-body-home",
    name: "Full Body at Home",
    level: "beginner",
    daysPerWeek: 3,
    equipment: "none",
    summary: "No equipment needed. Train on non-consecutive days, e.g. Mon / Wed / Fri.",
    exercises: [
      { name: "Bodyweight Squat", sets: 3, reps: "10-15", restSec: 60 },
      { name: "Incline Push-Up", sets: 3, reps: "6-12", restSec: 60 },
      { name: "Single Leg Glute Bridge", sets: 3, reps: "8-12", restSec: 60 },
      { name: "Superman", sets: 2, reps: "10-12", restSec: 45 },
      { name: "Plank", sets: 3, reps: "20-40 sec", restSec: 45 }
    ]
  },
  {
    key: "full-body-gym",
    name: "Full Body at the Gym",
    level: "beginner",
    daysPerWeek: 3,
    equipment: "gym",
    summary: "Machine-friendly and simple to learn. Add weight slowly once all reps feel easy.",
    exercises: [
      { name: "Leg Press", sets: 3, reps: "10-12", restSec: 90 },
      { name: "Dumbbell Bench Press", sets: 3, reps: "8-12", restSec: 90 },
      { name: "Seated Cable Rows", sets: 3, reps: "10-12", restSec: 90 },
      { name: "Seated Dumbbell Press", sets: 2, reps: "10-12", restSec: 75 },
      { name: "Plank", sets: 3, reps: "30-45 sec", restSec: 45 }
    ]
  },
  {
    key: "upper-body",
    name: "Upper Body Day",
    level: "beginner",
    daysPerWeek: 2,
    equipment: "gym",
    summary: "Pair with Lower Body Day for a 4-day split (Upper, Lower, rest, Upper, Lower).",
    exercises: [
      { name: "Dumbbell Bench Press", sets: 3, reps: "8-12", restSec: 90 },
      { name: "Wide-Grip Lat Pulldown", sets: 3, reps: "8-12", restSec: 90 },
      { name: "Dumbbell Shoulder Press", sets: 3, reps: "8-12", restSec: 75 },
      { name: "Dumbbell Bicep Curl", sets: 2, reps: "10-15", restSec: 60 },
      { name: "Triceps Pushdown", sets: 2, reps: "10-15", restSec: 60 }
    ]
  },
  {
    key: "lower-body",
    name: "Lower Body Day",
    level: "beginner",
    daysPerWeek: 2,
    equipment: "dumbbells",
    summary: "Legs, glutes and core with just a pair of dumbbells.",
    exercises: [
      { name: "Goblet Squat", sets: 3, reps: "8-12", restSec: 90 },
      { name: "Romanian Deadlift", sets: 3, reps: "8-12", restSec: 90 },
      { name: "Dumbbell Lunges", sets: 2, reps: "8-10 each leg", restSec: 75 },
      { name: "Standing Calf Raises", sets: 3, reps: "12-15", restSec: 45 },
      { name: "Crunches", sets: 3, reps: "12-15", restSec: 45 }
    ]
  },
  {
    key: "core-mobility",
    name: "Core & Mobility (15 min)",
    level: "beginner",
    daysPerWeek: 3,
    equipment: "none",
    summary: "A gentle finisher or rest-day routine for posture and a stronger core.",
    exercises: [
      { name: "Cat Stretch", sets: 2, reps: "8-10", restSec: 20 },
      { name: "Plank", sets: 3, reps: "20-40 sec", restSec: 30 },
      { name: "Reverse Crunch", sets: 2, reps: "10-12", restSec: 30 },
      { name: "Superman", sets: 2, reps: "10-12", restSec: 30 },
      { name: "Child's Pose", sets: 1, reps: "30-60 sec", restSec: 0 }
    ]
  }
];
