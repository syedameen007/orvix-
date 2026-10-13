export type VerificationState =
  | "MANUFACTURER_VERIFIED"
  | "OFFICIAL_SOURCE"
  | "LICENSED_DATA"
  | "OPEN_DATA"
  | "USER_SUBMITTED"
  | "AI_ESTIMATED"
  | "UNVERIFIED";

export type DataLifecycle = "DRAFT" | "REVIEW" | "VERIFIED" | "PUBLISHED" | "DEPRECATED";

export type FoodState = "RAW" | "COOKED" | "PREPARED" | "PACKAGED" | "UNKNOWN";

export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK" | "CUSTOM";

export type Unit =
  | "g"
  | "kg"
  | "mg"
  | "ml"
  | "L"
  | "cup"
  | "bowl"
  | "plate"
  | "tbsp"
  | "tsp"
  | "piece"
  | "egg"
  | "chapati"
  | "slice"
  | "serving"
  | "custom";

export interface NutrientAmount {
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  saturatedFatG?: number | null;
  fiberG?: number | null;
  sugarG?: number | null;
  sodiumMg?: number | null;
  cholesterolMg?: number | null;
  micronutrients?: Record<string, number | null>;
}

export interface ServingDefinition {
  baseQuantity: number;
  baseUnit: Unit;
  gramWeight?: number | null;
  mlVolume?: number | null;
  label?: string | null;
}

export interface FoodSnapshot {
  id: string;
  name: string;
  brandName?: string | null;
  state: FoodState;
  verification: VerificationState;
  serving: ServingDefinition;
  nutrientsPerServing: NutrientAmount;
}

export interface MealItemInput {
  food: FoodSnapshot;
  quantity: number;
  unit: Unit;
}

export interface CalculatedMealItem extends MealItemInput {
  nutrients: NutrientAmount;
}

export interface MealCalculation {
  items: CalculatedMealItem[];
  total: NutrientAmount;
}

export type SetType = "WORKING" | "WARMUP" | "DROP" | "FAILURE" | "AMRAP";

export interface WorkoutSetInput {
  setNumber: number;
  weight?: number | null;
  weightUnit?: "kg" | "lb" | null;
  reps?: number | null;
  rpe?: number | null;
  rir?: number | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: "m" | "km" | "mi" | null;
  restSeconds?: number | null;
  setType?: SetType;
  notes?: string | null;
}

export interface ParsedVoiceFood {
  rawText: string;
  quantity: number;
  unit: Unit;
  query: string;
  brandHint?: string | null;
}

export interface ProviderResult<T> {
  configured: boolean;
  provider: string | null;
  data?: T;
  message?: string;
}
