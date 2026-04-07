/**
 * Parse strings like "107K", "1.2k", "172", "2.5M" into a non-negative integer (rounded).
 */
export function parseEngagementNumber(raw: string): number {
  const t = raw.trim().replace(/,/g, "").toLowerCase();
  if (!t) return 0;
  const m = t.match(/^([\d.]+)\s*([km])?$/);
  if (!m) {
    const digits = parseInt(t.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(digits) ? digits : 0;
  }
  let n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const suffix = m[2];
  if (suffix === "k") n *= 1000;
  if (suffix === "m") n *= 1_000_000;
  return Math.max(0, Math.round(n));
}
