import { describe, expect, it } from "vitest";
import { rankSearchCandidate } from "../packages/utils/src/search.js";

describe("search ranking", () => {
  it("matches multi-word queries when candidate tokens are separated", () => {
    expect(rankSearchCandidate("thai noodle", "Thai peanut noodle kit")).toBeGreaterThan(0);
    expect(rankSearchCandidate("arnold press", "Arnold Shoulder Press")).toBeGreaterThan(0);
  });
});
