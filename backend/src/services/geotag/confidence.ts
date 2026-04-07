/**
 * Map Google Geocoding result quality to a 0–1 score for fusion with Gemini confidence.
 *
 * - ROOFTOP / RANGE_INTERPOLATED → high precision
 * - GEOMETRIC_CENTER / APPROXIMATE → lower
 * - partial_match true → penalize
 */
export function geocodeLocationTypeScore(locationType: string | undefined, partialMatch: boolean): number {
  let base = 0.55;
  switch (locationType) {
    case "ROOFTOP":
      base = 0.95;
      break;
    case "RANGE_INTERPOLATED":
      base = 0.88;
      break;
    case "GEOMETRIC_CENTER":
      base = 0.72;
      break;
    case "APPROXIMATE":
      base = 0.6;
      break;
    default:
      base = 0.55;
  }
  if (partialMatch) base *= 0.85;
  return Math.max(0.15, Math.min(1, base));
}

export function fuseConfidence(geminiConfidence: number, geocodeScore: number): number {
  const g = Number.isFinite(geminiConfidence) ? Math.max(0, Math.min(1, geminiConfidence)) : 0;
  const geo = Number.isFinite(geocodeScore) ? Math.max(0, Math.min(1, geocodeScore)) : 0;
  return Math.max(0, Math.min(1, Math.min(g, geo)));
}
