import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/db", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: "ok", database: "ok" });
  } catch (error) {
    console.error("GET /healthz/db error:", error);
    res.status(503).json({ status: "error", database: "unavailable" });
  }
});

export default router;
