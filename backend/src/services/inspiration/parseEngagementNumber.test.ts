import { describe, expect, it } from "vitest";
import { parseEngagementNumber } from "./parseEngagementNumber";

describe("parseEngagementNumber", () => {
  it("parses plain integers", () => {
    expect(parseEngagementNumber("172")).toBe(172);
  });

  it("parses K suffix", () => {
    expect(parseEngagementNumber("107K")).toBe(107000);
    expect(parseEngagementNumber("1.2k")).toBe(1200);
  });

  it("parses commas", () => {
    expect(parseEngagementNumber("1,234")).toBe(1234);
  });
});
