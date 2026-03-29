import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import webhooksRouter from "./routes/webhooks";

const app: Express = express();

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (process.env.NODE_ENV !== "production" || allowedOrigins.length === 0) {
      callback(null, true);
      return;
    }

    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    console.warn("Blocked CORS origin", {
      origin: normalizedOrigin,
      allowedOrigins,
    });
    callback(new Error("Not allowed by CORS"));
  },
}));

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
