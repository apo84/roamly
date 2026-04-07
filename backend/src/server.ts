import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import authRoutes from "./routes/auth";
import meRoutes from "./routes/me";
import healthRoutes from "./routes/health";
import collectionsRoutes from "./routes/collections";
import inspirationRoutes from "./routes/inspiration";
import mapRoutes from "./routes/map";
import { runGeotagWorkerLoop } from "./workers/geotagWorkerLoop";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", meRoutes);
app.use("/api", collectionsRoutes);
app.use("/api", inspirationRoutes);
app.use("/api", mapRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`Trove backend listening on port ${env.port}`);

  // In dev, auto-start the geotag worker so `POST /api/inspiration/save` => `geotag_jobs`
  // gets drained without needing a separate terminal.
  if (env.nodeEnv !== "production" && env.geotagEnabled && env.geotagAsync) {
    console.log("[geotag worker] auto-starting from backend server (dev mode)");
    void runGeotagWorkerLoop();
  }
});

