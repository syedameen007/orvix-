import type { ParsedVoiceFood, Unit } from "@orvix/types";

const unitAliases: Record<string, Unit> = {
  gram: "g",
  grams: "g",
  g: "g",
  kilogram: "kg",
  kilograms: "kg",
  kg: "kg",
  milligram: "mg",
  milligrams: "mg",
  mg: "mg",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  ml: "ml",
  liter: "L",
  liters: "L",
  litre: "L",
  litres: "L",
  l: "L",
  cup: "cup",
  cups: "cup",
  bowl: "bowl",
  bowls: "bowl",
  plate: "plate",
  plates: "plate",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbsp: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tsp: "tsp",
  piece: "piece",
  pieces: "piece",
  egg: "egg",
  eggs: "egg",
  chapati: "chapati",
  chapatis: "chapati",
  roti: "chapati",
  rotis: "chapati",
  slice: "slice",
  slices: "slice",
  serving: "serving",
  servings: "serving"
};

const leadingNoise = /^(i\s+ate|i\s+had|ate|had|log|add|for\s+(breakfast|lunch|dinner|snack)\s+i\s+ate)\s+/i;

function singularizeKnownFood(query: string, unit: Unit): string {
  const trimmed = query.trim();
  if (unit === "egg" && /^eggs?$/i.test(trimmed)) return "egg";
  if (unit === "chapati" && /^(chapatis?|rotis?)$/i.test(trimmed)) return "chapati";
  return trimmed;
}

export function parseVoiceFoodLog(transcript: string): ParsedVoiceFood[] {
  const cleaned = transcript
    .toLowerCase()
    .replace(leadingNoise, "")
    .replace(/\band\b/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map<ParsedVoiceFood | null>((part) => {
      const match = part.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s*(.+)?$/);
      if (!match) return null;
      const quantity = Number(match[1]);
      const unitToken = match[2] ?? "";
      const unit = unitAliases[unitToken] ?? "serving";
      const remaining = (match[3] ?? unitToken).replace(/[.,!?;:]+$/g, "").trim();
      const query = singularizeKnownFood(remaining || unitToken, unit);
      if (!Number.isFinite(quantity) || quantity <= 0 || !query) return null;
      return {
        rawText: part,
        quantity,
        unit,
        query,
        brandHint: null
      } satisfies ParsedVoiceFood;
    })
    .filter((item): item is ParsedVoiceFood => item !== null);
}
