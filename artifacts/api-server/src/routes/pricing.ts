import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  calculateDtfPricingForUser,
  DtfPricingError,
  type DtfPricingInput,
} from "../lib/dtf-pricing";

const pricingRouter = Router();

pricingRouter.post("/pricing/dtf-quote", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const input = req.body as DtfPricingInput;
    const pricing = await calculateDtfPricingForUser(userId, input);
    res.json({ pricing });
  } catch (err) {
    if (err instanceof DtfPricingError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }

    console.error("POST /pricing/dtf-quote error:", err);
    res.status(500).json({ error: "No se pudo calcular la cotización DTF" });
  }
});

export default pricingRouter;
