import type { Response } from "express";
import express from "express";
import { supabaseAdmin } from "../supabaseClient";
import type { AuthenticatedRequest } from "../middleware/requireAuth";
import { requireAuth } from "../middleware/requireAuth";

const router = express.Router();

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const email = req.user!.email ?? null;

  // Backend-owned upsert of the app-level user profile.
  const { error: upsertError } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        id: userId,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (upsertError) {
    return res.status(500).json({ error: "Failed to sync user profile" });
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, display_name, avatar_url, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error) {
    return res.status(500).json({ error: "Failed to load profile" });
  }

  return res.json({ user: data });
});

export default router;

