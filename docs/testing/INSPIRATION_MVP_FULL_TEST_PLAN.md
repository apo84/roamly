# Inspiration MVP Full Test Plan

This checklist verifies Agents 1–8 end-to-end (Supabase + backend + mobile).

## 0) Preconditions

- Supabase migration from Agent 1 applied.
- Backend env configured (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).
- Mobile env configured (`EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_API_URL`).
- Supabase Auth redirect URLs include current Expo redirect (`exp://.../--/auth/callback` in Expo Go).

## 1) Automated checks (repo)

### Backend unit tests

```bash
cd backend
npm test
```

### Backend smoke flow (real API + real token)

```bash
cd backend
ACCESS_TOKEN="<supabase_access_token>" API_BASE_URL="http://localhost:4000" npm run test:smoke:inspiration
```

What this smoke test validates:

1. health check
2. create collection
3. save inspiration link
4. list library
5. fetch detail
6. patch note
7. attach place (creates location + attaches to collection item)
8. list with `hasLocation=true`
9. delete save

## 2) Manual mobile E2E flow

1. Start backend:
   ```bash
   cd backend
   npm run dev
   ```
2. Start mobile:
   ```bash
   cd mobile
   npx expo start --clear
   ```
3. Sign in on mobile.
4. Go to **Inspo → Add**.
5. Paste an IG/TikTok/YouTube URL, add note, optionally select a collection and dates.
6. Tap **Save link**.
7. Verify it appears in **Inspo → Library** with thumbnail/title/platform/note line.
8. Open detail by tapping item.
9. Tap **Open original link** and confirm OS opens source.
10. In detail, set place (`placeLabel`, `lat`, `lng`) and save.
11. Go to **Map** tab and verify item appears under location feed.
12. Back in detail, tap **Remove save** and verify it disappears from library.

## 3) Useful debugging checks

- If save fails with auth errors:
  - verify mobile session exists on Account tab.
  - verify `EXPO_PUBLIC_API_URL` points to backend (`http://localhost:4000` / `http://10.0.2.2:4000` / LAN IP).
- If OAuth fails:
  - verify exact Expo redirect in Supabase Redirect URLs.
- If place attach fails:
  - ensure the save was attached to a collection item (or provide `collectionId` in PATCH).
