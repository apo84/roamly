/** Valid WGS84 decimals for DB storage / map pins. */
export function isValidWgs84(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Soften confidence when the model flags high ambiguity. */
export function applyAmbiguityPenalty(confidence: number, ambiguity: "low" | "medium" | "high"): number {
  const c = Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;
  if (ambiguity === "high") return Math.max(0, c * 0.85);
  if (ambiguity === "medium") return Math.max(0, c * 0.95);
  return c;
}
