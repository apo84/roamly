import { describe, expect, it } from "vitest";
import { parseSocialUrl } from "./parseSocialUrl";
import { urlAllowed } from "./allowlist";

describe("parseSocialUrl", () => {
  it("parses Instagram /p/ shortcode", () => {
    const r = parseSocialUrl("https://www.instagram.com/p/AbCdEfGhIjK/");
    expect(r).toEqual({
      platform: "instagram",
      externalId: "AbCdEfGhIjK",
      canonicalUrl: "https://www.instagram.com/p/AbCdEfGhIjK/",
    });
  });

  it("parses Instagram reel", () => {
    const r = parseSocialUrl("https://instagram.com/reel/XYZ123/");
    expect(r?.platform).toBe("instagram");
    expect(r?.externalId).toBe("XYZ123");
  });

  it("parses TikTok /video/id", () => {
    const r = parseSocialUrl("https://www.tiktok.com/@user/video/7123456789012345678");
    expect(r).toEqual({
      platform: "tiktok",
      externalId: "7123456789012345678",
      canonicalUrl: "https://www.tiktok.com/video/7123456789012345678",
    });
  });

  it("parses YouTube watch URL", () => {
    const r = parseSocialUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share");
    expect(r).toEqual({
      platform: "youtube",
      externalId: "dQw4w9WgXcQ",
      canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  });

  it("parses youtu.be short links", () => {
    const r = parseSocialUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(r?.externalId).toBe("dQw4w9WgXcQ");
  });

  it("parses YouTube shorts", () => {
    const r = parseSocialUrl("https://youtube.com/shorts/dQw4w9WgXcQ");
    expect(r?.platform).toBe("youtube");
  });

  it("returns null for unsupported hosts", () => {
    expect(parseSocialUrl("https://example.com/video/1")).toBeNull();
  });
});

describe("urlAllowed", () => {
  it("allows vm.tiktok.com", () => {
    expect(urlAllowed("https://vm.tiktok.com/ZMxxx/")).toBe(true);
  });

  it("rejects arbitrary hosts", () => {
    expect(urlAllowed("https://evil.com/redirect")).toBe(false);
  });
});
