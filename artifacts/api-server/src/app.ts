import crypto from "crypto";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
// import { rateLimit, authRateLimit } from "./middleware/rate-limit";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import router from "./routes";
import webhooksRouter from "./routes/webhooks";
import { env } from "./env";

const app: Express = express();
app.set("trust proxy", 1);

const hostedDefaultOrigins = [
  "https://yaguarestudio.xyz",
  "https://www.yaguarestudio.xyz",
];

const vercelPreviewPattern = /^[a-z0-9-]+\.vercel\.app$/i;

function normalizeOrigin(origin: string): string | null {
  const trimmed = origin.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return null;

  const candidate = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

const configuredOrigins = (env.frontendUrl || "")
  .split(",")
  .map(normalizeOrigin)
  .filter((origin): origin is string => Boolean(origin));

const allowedOrigins = Array.from(
  new Set(
    [
      ...configuredOrigins,
      ...(env.isHosted ? hostedDefaultOrigins : []),
    ]
      .map(normalizeOrigin)
      .filter((origin): origin is string => Boolean(origin))
  )
);

function isAllowedOrigin(origin: unknown): boolean {
  if (typeof origin !== "string") {
    return false;
  }

  const normalized = normalizeOrigin(origin);
  if (!normalized) {
    return false;
  }

  if (allowedOrigins.includes(normalized)) {
    return true;
  }

  let hostname = "";
  try {
    hostname = new URL(normalized).hostname.toLowerCase();
  } catch {
    return false;
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return true;
  }

  if (hostname === "yaguarestudio.xyz" || hostname === "www.yaguarestudio.xyz") {
    return true;
  }

  const isYaguarPrefix = hostname.startsWith("yaguarestudio");
  if (isYaguarPrefix) {
    if (hostname.endsWith(".yaguarestudio.xyz")) {
      return true;
    }

    if (hostname.endsWith(".vercel.app")) {
      return true;
    }
  }

  // Restrict previews to yaguarestudio-* Vercel subdomains only.
  return vercelPreviewPattern.test(hostname) && hostname.startsWith("yaguarestudio-");
}

app.use((req, res, next) => {
  const requestId = req.header("x-request-id")?.trim() || crypto.randomUUID();
  const startedAt = Date.now();

  res.setHeader("x-request-id", requestId);
  res.locals.requestId = requestId;

  res.on("finish", () => {
    const shouldLog =
      req.path.startsWith("/webhooks") ||
      res.statusCode >= 400;

    if (!shouldLog) {
      return;
    }

    console.info("[http]", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});

app.use((_, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (env.isHosted) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

const corsOptions: cors.CorsOptions = {
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-request-id"],
  origin(origin, callback) {
    if (!env.isHosted) {
      callback(null, true);
      return;
    }

    // Allow requests without Origin header (health checks, server-to-server calls, Postman).
    if (!origin) {
      callback(null, true);
      return;
    }

    if (typeof origin !== "string") {
      callback(null, false);
      return;
    }

    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin) || origin;

    console.warn("Blocked CORS origin", {
      origin: normalizedOrigin,
      allowedOrigins,
    });
    callback(null, false);
  },
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck endpoint para Railway/Render
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/webhooks", webhooksRouter);
app.use("/api", router);

export default app;
