import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import webhooksRouter from "./routes/webhooks";

const app: Express = express();

const frontendUrl = process.env.FRONTEND_URL;

app.use(cors({
  credentials: true,
  origin: process.env.NODE_ENV === "production" && frontendUrl ? frontendUrl : true,
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
