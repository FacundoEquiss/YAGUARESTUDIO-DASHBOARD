import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "@workspace/db";
import { feedbacks } from "@workspace/db/schema";

const router = Router();

router.post("/feedback", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const type = req.body?.type;
    const message = req.body?.message;

    if (!type || !["bug", "sugerencia", "otro"].includes(type)) {
      res.status(400).json({ error: "Tipo de feedback inválido." });
      return;
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      res.status(400).json({ error: "El mensaje debe tener al menos 5 caracteres." });
      return;
    }

    await db.insert(feedbacks).values({
      userId,
      type,
      message,
    });

    res.status(201).json({ message: "Feedback enviado correctamente." });
  } catch (err: any) {
    console.error("Feedback error:", err);
    res.status(500).json({ error: "No se pudo procesar el feedback." });
  }
});

export default router;
