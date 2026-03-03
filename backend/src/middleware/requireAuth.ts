import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabaseClient";

export interface AuthUser {
  id: string;
  email?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization token" });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = { id: data.user.id, email: data.user.email };
  return next();
}

