import type { Response } from "express";

export type InspirationErrorCode =
  | "INVALID_URL"
  | "URL_NOT_ALLOWED"
  | "UNFURL_FAILED"
  | "DUPLICATE_SAVE"
  | "COLLECTION_NOT_FOUND"
  | "NOT_FOUND"
  | "BAD_REQUEST";

export function sendInspirationError(
  res: Response,
  status: number,
  code: InspirationErrorCode,
  message: string,
): Response {
  return res.status(status).json({ code, message });
}
