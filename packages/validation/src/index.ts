import { z } from "zod";

export const unitSchema = z.enum([
  "g",
  "kg",
  "mg",
  "ml",
  "L",
  "cup",
  "bowl",
  "plate",
  "tbsp",
  "tsp",
  "piece",
  "egg",
  "chapati",
  "slice",
  "serving",
  "custom"
]);

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "Include at least one letter and one number");

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().trim().min(1).max(120)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200)
});

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  profilePhotoUrl: z.string().url().nullable().optional(),
  age: z.number().int().min(13).max(120).nullable().optional(),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  onboardingCompleted: z.boolean().optional(),
  heightCm: z.number().positive().nullable().optional(),
  currentWeightKg: z.number().positive().nullable().optional(),
  startingWeightKg: z.number().positive().nullable().optional(),
  targetWeightKg: z.number().positive().nullable().optional(),
  primaryGoal: z.string().max(120).nullable().optional(),
  activityLevel: z.string().max(80).nullable().optional(),
  trainingExperience: z.string().max(80).nullable().optional(),
  trainingFrequency: z.string().max(80).nullable().optional(),
  workoutDurationMinutes: z.number().int().positive().nullable().optional(),
  availableEquipment: z.array(z.string().max(80)).optional(),
  preferredTrainingStyle: z.string().max(120).nullable().optional(),
  calorieTarget: z.number().positive().nullable().optional(),
  proteinTargetG: z.number().nonnegative().nullable().optional(),
  carbTargetG: z.number().nonnegative().nullable().optional(),
  fatTargetG: z.number().nonnegative().nullable().optional(),
  fiberTargetG: z.number().nonnegative().nullable().optional(),
  waterTargetMl: z.number().nonnegative().nullable().optional(),
  dietPreference: z.string().max(120).nullable().optional(),
  preferredFoods: z.array(z.string().max(120)).optional(),
  dislikedFoods: z.array(z.string().max(120)).optional(),
  allergies: z.array(z.string().max(120)).optional(),
  dietaryRestrictions: z.array(z.string().max(120)).optional(),
  units: z.enum(["METRIC", "IMPERIAL"]).optional(),
  privacySettings: z.record(z.unknown()).optional(),
  notificationPreferences: z.record(z.unknown()).optional(),
  aiPreferences: z.record(z.unknown()).optional(),
  quietHours: z.record(z.unknown()).optional()
});

export const nutrientSchema = z.object({
  calories: z.number().nullable().optional(),
  proteinG: z.number().nullable().optional(),
  carbsG: z.number().nullable().optional(),
  fatG: z.number().nullable().optional(),
  saturatedFatG: z.number().nullable().optional(),
  fiberG: z.number().nullable().optional(),
  sugarG: z.number().nullable().optional(),
  sodiumMg: z.number().nullable().optional(),
  cholesterolMg: z.number().nullable().optional(),
  micronutrients: z.record(z.number().nullable()).optional()
});

export const customFoodSchema = z.object({
  name: z.string().min(1).max(240),
  brandName: z.string().max(180).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  foodState: z.enum(["RAW", "COOKED", "PREPARED", "PACKAGED", "UNKNOWN"]).default("UNKNOWN"),
  servingQuantity: z.number().positive(),
  servingUnit: unitSchema,
  gramWeight: z.number().positive().nullable().optional(),
  mlVolume: z.number().positive().nullable().optional(),
  barcode: z.string().max(64).nullable().optional(),
  ingredients: z.array(z.string().max(180)).default([]),
  allergens: z.array(z.string().max(180)).default([]),
  nutrients: nutrientSchema,
  notes: z.string().max(1000).nullable().optional()
});

export const mealCreateSchema = z.object({
  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "CUSTOM"]),
  customName: z.string().max(100).nullable().optional(),
  items: z
    .array(
      z.object({
        foodId: z.string().min(1),
        quantity: z.number().positive(),
        unit: unitSchema
      })
    )
    .min(1)
});

export const recipeCreateSchema = z.object({
  name: z.string().min(1).max(180),
  servings: z.number().positive(),
  items: mealCreateSchema.shape.items
});

export const workoutTemplateSchema = z.object({
  name: z.string().min(1).max(180),
  categoryName: z.string().max(120).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        order: z.number().int().nonnegative(),
        targetSets: z.number().int().positive().nullable().optional(),
        notes: z.string().max(1000).nullable().optional()
      })
    )
    .default([])
});

export const customExerciseSchema = z.object({
  name: z.string().min(1).max(180),
  aliases: z.array(z.string().max(120)).default([]),
  primaryMuscles: z.array(z.string().max(80)).default([]),
  secondaryMuscles: z.array(z.string().max(80)).default([]),
  equipment: z.array(z.string().max(80)).default([]),
  movementPattern: z.string().max(100).nullable().optional(),
  difficulty: z.string().max(80).nullable().optional(),
  instructions: z.string().max(3000).nullable().optional(),
  safetyNotes: z.string().max(3000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional()
});

export const workoutSetSchema = z.object({
  weight: z.number().nonnegative().nullable().optional(),
  weightUnit: z.enum(["kg", "lb"]).nullable().optional(),
  reps: z.number().int().nonnegative().nullable().optional(),
  rpe: z.number().min(0).max(10).nullable().optional(),
  rir: z.number().min(0).max(10).nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  distance: z.number().nonnegative().nullable().optional(),
  distanceUnit: z.enum(["m", "km", "mi"]).nullable().optional(),
  restSeconds: z.number().int().nonnegative().nullable().optional(),
  setType: z.enum(["WORKING", "WARMUP", "DROP", "FAILURE", "AMRAP"]).default("WORKING"),
  notes: z.string().max(1000).nullable().optional()
});

export const programSchema = z.object({
  name: z.string().min(1).max(180),
  description: z.string().max(2000).nullable().optional(),
  days: z.array(
    z.object({
      name: z.string().min(1).max(120),
      order: z.number().int().nonnegative(),
      workoutTemplateId: z.string().min(1).nullable().optional(),
      notes: z.string().max(1000).nullable().optional()
    })
  )
});

export const progressWeightSchema = z.object({
  measuredAt: z.string().datetime().optional(),
  weightKg: z.number().positive(),
  notes: z.string().max(1000).nullable().optional()
});

export const voiceLogSchema = z.object({
  transcript: z.string().min(1).max(4000)
});

export const aiChatSchema = z.object({
  message: z.string().min(1).max(8000)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type MealCreateInput = z.infer<typeof mealCreateSchema>;

export const onboardingSchema = z.object({
  name: z.string().min(1).max(120),
  goal: z.enum(["LOSE_FAT", "BUILD_MUSCLE", "MAINTAIN", "GET_FITTER"]),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]),
  age: z.number().int().min(13).max(100),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  targetWeightKg: z.number().min(30).max(300).nullable().optional(),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "ACTIVE"]),
  trainingExperience: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("BEGINNER"),
  dietPreference: z.string().max(120).nullable().optional()
});

export const waterEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amountMl: z.number().positive().max(3000)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1).max(200)
});
