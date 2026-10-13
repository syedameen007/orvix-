import { describe, expect, it } from "vitest";
import { parseVoiceFoodLog } from "../packages/utils/src/voiceParser.js";

describe("voice food logging parser", () => {
  it("extracts quantity, unit, and food query without inventing nutrition", () => {
    const parsed = parseVoiceFoodLog("I ate 3 eggs, 2 chapatis, 105 grams chicken and 250 ml milk.");
    expect(parsed).toEqual([
      expect.objectContaining({ quantity: 3, unit: "egg", query: "egg" }),
      expect.objectContaining({ quantity: 2, unit: "chapati", query: "chapati" }),
      expect.objectContaining({ quantity: 105, unit: "g", query: "chicken" }),
      expect.objectContaining({ quantity: 250, unit: "ml", query: "milk" })
    ]);
  });
});
