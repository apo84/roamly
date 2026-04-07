/* eslint-disable no-console */
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const TEST_URL = process.env.TEST_URL || "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

if (!ACCESS_TOKEN) {
  console.error("Missing ACCESS_TOKEN. Usage:");
  console.error("ACCESS_TOKEN=<supabase_access_token> API_BASE_URL=http://localhost:4000 node backend/scripts/smoke-inspiration.mjs");
  process.exit(1);
}

async function request(path, init = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}: ${JSON.stringify(body)}`);
  }
  return body;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log("1) health check");
  await request("/api/health");

  console.log("2) create collection");
  const collectionRes = await request("/api/collections", {
    method: "POST",
    body: JSON.stringify({ name: `Smoke ${Date.now()}`, description: "inspiration smoke test" }),
  });
  const collectionId = collectionRes?.collection?.id;
  assert(collectionId, "collection id should exist");

  console.log("3) save inspiration link");
  const saveRes = await request("/api/inspiration/save", {
    method: "POST",
    body: JSON.stringify({
      url: TEST_URL,
      note: "smoke-note",
      collectionId,
      visitStart: "2026-04-01",
      visitEnd: "2026-04-03",
    }),
  });
  const videoId = saveRes?.video?.id;
  assert(videoId, "video id should exist");

  console.log("4) list inspiration");
  const listRes = await request("/api/inspiration");
  assert(Array.isArray(listRes.items), "list should contain items array");
  assert(listRes.items.some((x) => x.video?.id === videoId), "saved video should be listed");

  console.log("5) get inspiration detail");
  const detailRes = await request(`/api/inspiration/${videoId}`);
  assert(detailRes.video?.id === videoId, "detail should match saved video");

  console.log("6) patch note");
  const patchNoteRes = await request(`/api/inspiration/${videoId}`, {
    method: "PATCH",
    body: JSON.stringify({ note: "updated-smoke-note" }),
  });
  assert(patchNoteRes.savedLink?.user_note === "updated-smoke-note", "note should update");

  console.log("7) attach place to collection item");
  await request(`/api/inspiration/${videoId}`, {
    method: "PATCH",
    body: JSON.stringify({
      collectionId,
      placeLabel: "Smoke Place",
      lat: 41.3851,
      lng: 2.1734,
      placeCity: "Barcelona",
      placeCountry: "Spain",
    }),
  });

  console.log("8) list hasLocation=true");
  const mapRes = await request("/api/inspiration?hasLocation=true");
  assert(Array.isArray(mapRes.items), "map list should contain items array");
  assert(mapRes.items.some((x) => x.video?.id === videoId), "located video should be listed in map feed");

  console.log("9) delete saved inspiration");
  await request(`/api/inspiration/${videoId}`, { method: "DELETE" });

  const afterDelete = await request("/api/inspiration");
  assert(!afterDelete.items.some((x) => x.video?.id === videoId), "video should be removed from library");

  console.log("✅ Inspiration smoke test passed");
}

run().catch((err) => {
  console.error("❌ Smoke test failed");
  console.error(err);
  process.exit(1);
});
