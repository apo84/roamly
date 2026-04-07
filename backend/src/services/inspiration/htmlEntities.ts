/**
 * Decode HTML entities (numeric hex/decimal + common named) for OG metadata strings.
 */
function codePointToChar(cp: number): string {
  try {
    if (cp === 0 || (cp >= 0xd800 && cp <= 0xdfff) || cp > 0x10ffff) return "";
    return String.fromCodePoint(cp);
  } catch {
    return "";
  }
}

export function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  let s = input;

  s = s.replace(/&#x([0-9a-fA-F]{1,6});/g, (_, hex) => codePointToChar(parseInt(hex, 16)));
  s = s.replace(/&#(\d{1,7});/g, (_, dec) => codePointToChar(parseInt(dec, 10)));

  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'");

  return s;
}
