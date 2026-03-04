import type { Request, Response } from "express";
import express from "express";

const router = express.Router();

router.get("/health", (req: Request, res: Response) => {
  return res.json({ status: "ok" });
});

export default router;

