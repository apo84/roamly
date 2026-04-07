import { describe, expect, it } from "vitest";
import { decodeHtmlEntities } from "./htmlEntities";

describe("decodeHtmlEntities", () => {
  it("decodes hex numeric entities", () => {
    expect(decodeHtmlEntities("&#x1f3d4;&#xfe0f;")).toBe("🏔️");
  });

  it("decodes decimal entities", () => {
    expect(decodeHtmlEntities("&#39;")).toBe("'");
  });

  it("decodes named entities", () => {
    expect(decodeHtmlEntities("a &amp; b &quot;x&quot;")).toBe('a & b "x"');
  });

  it("handles mathematical alphanumeric symbols used in IG titles", () => {
    const raw = "&#x1d7f0;&#x1d7ef;&#x1d7f0; &#x1f1fa;&#x1f1f8;";
    const out = decodeHtmlEntities(raw);
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain("&#x");
  });
});
