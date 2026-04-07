import { describe, expect, it } from "vitest";
import {
  deriveFromInstagramUnfurl,
  parseInstagramOgDescription,
  parseInstagramOgTitle,
} from "./instagramMetadata";

const SAMPLE_DESC = `107K likes, 172 comments - 434lost on February 21, 2026: "Follow for more &#x1f3d4;&#xfe0f; (17.7k/20k)

#mountains #travel #hiking #tetons #outdoors". `;

const SAMPLE_TITLE = `&#x1d7f0;&#x1d7ef;&#x1d7f0; &#x1f1fa;&#x1f1f8; on Instagram: "Follow for more &#x1f3d4;&#xfe0f; (17.7k/20k)

#mountains #travel #hiking #tetons #outdoors"`;

describe("parseInstagramOgDescription", () => {
  it("extracts likes, comments, handle, caption raw", () => {
    const r = parseInstagramOgDescription(SAMPLE_DESC);
    expect(r.likeCount).toBe(107000);
    expect(r.commentCount).toBe(172);
    expect(r.handle).toBe("434lost");
    expect(r.captionRaw).toContain("Follow for more");
    expect(r.captionRaw).toContain("#mountains");
  });
});

describe("parseInstagramOgTitle", () => {
  it("extracts display name segment before on Instagram", () => {
    const r = parseInstagramOgTitle(SAMPLE_TITLE);
    expect(r.displayNameRaw).toContain("&#x1d7f0;");
  });
});

describe("deriveFromInstagramUnfurl", () => {
  it("produces decoded title, caption, and counts", () => {
    const d = deriveFromInstagramUnfurl(
      { title: SAMPLE_TITLE, description: SAMPLE_DESC },
      "Instagram fallback",
    );
    expect(d.handle).toBe("434lost");
    expect(d.likeCount).toBe(107000);
    expect(d.commentCount).toBe(172);
    expect(d.displayName).toBeTruthy();
    expect(d.displayName).not.toContain("&#x");
    expect(d.caption).toContain("Follow for more");
    expect(d.caption).not.toContain("&#x1f3d4");
    expect(d.videoCaption).toContain("#mountains");
  });
});
