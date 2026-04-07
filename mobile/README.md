# Trove Mobile (Expo Router)

This folder is scaffolded for adding a mobile client using **Expo Router** while keeping the existing web app unchanged.

Planned routes:
- Public: `/`, `/explore`, `/map`
- Auth callback: `/auth/callback`
- Protected: `/collections`, `/collections/new`, `/collections/[id]`, `/itinerary`, `/passport`

Next steps after scaffolding:
1. Create an Expo project in `mobile/` (or add Expo Router dependencies).
2. Wire Supabase auth + backend `/api/me` into `app/auth/callback.tsx`.
3. Gate protected routes based on the signed-in state.

