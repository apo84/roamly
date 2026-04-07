import { describe, expect, it } from "vitest";
import { extractHashtags } from "./buildGeotagInput";
import { fuseConfidence, geocodeLocationTypeScore } from "./confidence";

describe("extractHashtags", () => {
  it("collects unique tags", () => {
    expect(extractHashtags("Hello #Barcelona and #barcelona #food")).toEqual(["barcelona", "food"]);
  });
});

describe("geocodeLocationTypeScore", () => {
  it("scores ROOFTOP above APPROXIMATE", () => {
    expect(geocodeLocationTypeScore("ROOFTOP", false)).toBeGreaterThan(geocodeLocationTypeScore("APPROXIMATE", false));
  });
  it("penalizes partial_match", () => {
    expect(geocodeLocationTypeScore("ROOFTOP", true)).toBeLessThan(geocodeLocationTypeScore("ROOFTOP", false));
  });
});

describe("fuseConfidence", () => {
  it("takes min of inputs", () => {
    expect(fuseConfidence(0.9, 0.4)).toBe(0.4);
    expect(fuseConfidence(0.3, 0.8)).toBe(0.3);
  });
});
