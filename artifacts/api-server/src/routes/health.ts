import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const healthRouter = Router();

async function isDatabaseReady(): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

function getMemoryUsage() {
  const mem = process.memoryUsage();
  return {
    rss: `${(mem.rss / 1024 / 1024).toFixed(1)}MB`,
    heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
    heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
    external: `${(mem.external / 1024 / 1024).toFixed(1)}MB`,
  };
}

function getUptime() {
  const seconds = process.uptime();
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${days}d ${hours}h ${mins}m ${secs}s`;
}

// Basic health endpoint
healthRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    version: process.env.npm_package_version || "0.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Canonical health endpoint expected by smoke checks and frontend warmup.
healthRouter.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    version: process.env.npm_package_version || "0.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Database liveness endpoint for readiness checks.
healthRouter.get("/healthz/db", async (_req, res) => {
  const databaseReady = await isDatabaseReady();

  if (!databaseReady) {
    res.status(503).json({
      status: "degraded",
      database: "error",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(200).json({
    status: "ok",
    database: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Detailed health endpoint
healthRouter.get("/health/ready", async (_req, res) => {
  const checks: Record<string, string> = {
    env: "ok",
  };

  let status = "ok";

  // Check required env vars
  const required = ["JWT_SECRET", "DATABASE_URL"];
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    checks.env = `Missing: ${missing.join(", ")}`;
    status = "degraded";
  }

  // Memory threshold check
  const memPercent = getMemoryUsagePercent();
  if (memPercent > 85) {
    checks.memory = "WARNING: High memory usage";
    status = "degraded";
  }

  const health = {
    status,
    uptime: getUptime(),
    memory: getMemoryUsage(),
    version: process.env.npm_package_version || "0.0.0",
    timestamp: new Date().toISOString(),
    checks,
  };

  const statusCode = status === "degraded" ? 503 : 200;
  res.status(statusCode).json(health);
});

function getMemoryUsagePercent(): number {
  const mem = process.memoryUsage();
  return (mem.heapUsed / mem.heapTotal) * 100;
}

export default healthRouter;