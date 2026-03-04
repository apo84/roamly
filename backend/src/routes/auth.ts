import type { Request, Response } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { supabaseAdmin } from "../supabaseClient";

const router = express.Router();

// Start OAuth flow: returns the Supabase authorization URL for a provider.
router.post("/oauth/:provider/start", (req: Request, res: Response) => {
  const provider = req.params.provider as string;
  const supportedProviders = new Set(["google", "github", "apple"]);

  if (!supportedProviders.has(provider)) {
    return res.status(400).json({ error: "Unsupported provider" });
  }

  const url = new URL("/auth/v1/authorize", env.supabaseUrl);
  url.searchParams.set("provider", provider);
  url.searchParams.set("redirect_to", env.appOauthRedirectUrl);

  return res.json({ url: url.toString() });
});

// OAuth callback: exchange code for session, upsert profile, issue our own session token.
router.get("/oauth/callback", async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;

  if (!code) {
    return res.status(400).json({ error: "Missing OAuth code" });
  }

  const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    return res.status(401).json({ error: "OAuth exchange failed" });
  }

  const { user } = data;

  const displayName = (user.user_metadata as any)?.full_name ?? user.email ?? null;
  const avatarUrl = (user.user_metadata as any)?.avatar_url ?? null;

  const { error: upsertError } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email,
        display_name: displayName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (upsertError) {
    return res.status(500).json({ error: "Failed to sync user profile" });
  }

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    env.sessionSecret,
    { expiresIn: "7d" },
  );

  res.cookie("trove_session", token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.redirect("/");
});

router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("trove_session", {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
  });
  return res.status(204).send();
});

export default router;

