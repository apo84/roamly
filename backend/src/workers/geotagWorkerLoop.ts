/**
 * Poll `geotag_jobs` and run `runGeotagForVideo` for each claimed row.
 *
 * Run: `npm run worker:geotag` from `backend/` (requires `GEOTAG_ENABLED=1` and API keys for actual API calls).
 */
import { env } from "../config/env";
import { processNextGeotagJob } from "../services/geotag/geotagJob";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runGeotagWorkerLoop(): Promise<void> {
  if (!env.geotagEnabled) {
    console.warn("[geotag worker] GEOTAG_ENABLED is not set; worker will still drain jobs if any exist.");
  }
  const pollMs = env.geotagPollMs;
  console.log(`[geotag worker] started pollMs=${pollMs}`);

  for (;;) {
    try {
      const did = await processNextGeotagJob();
      await sleep(did ? 250 : pollMs);
    } catch (e) {
      console.error("[geotag worker] loop error", e);
      await sleep(pollMs);
    }
  }
}

// Only self-start when invoked as the worker entrypoint.
// When imported by `src/server.ts`, we do NOT want a second loop.
if (require.main === module) {
  void runGeotagWorkerLoop();
}
