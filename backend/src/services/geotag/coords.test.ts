import { describe, expect, it } from "vitest";
import { applyAmbiguityPenalty, isValidWgs84 } from "./coords";

describe("isValidWgs84", () => {
  it("accepts valid bounds", () => {
    expect(isValidWgs84(41.387, 2.168)).toBe(true);
    expect(isValidWgs84(-33.86, 151.2)).toBe(true);
  });
  it("rejects out of range", () => {
    expect(isValidWgs84(91, 0)).toBe(false);
    expect(isValidWgs84(0, 190)).toBe(false);
  });
});

describe("applyAmbiguityPenalty", () => {
  it("reduces confidence for high ambiguity", () => {
    expect(applyAmbiguityPenalty(1, "high")).toBeLessThan(applyAmbiguityPenalty(1, "low"));
  });
});
