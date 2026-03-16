import { Router } from "express";
import { db, dtfGlobalSettings } from "@workspace/db";
import { eq } from "drizzle-orm";

const settingsRouter = Router();

async function ensureSettingsRow() {
  const rows = await db.select().from(dtfGlobalSettings).where(eq(dtfGlobalSettings.id, 1));
  if (rows.length === 0) {
    await db.insert(dtfGlobalSettings).values({ id: 1, pricePerMeter: 10000, rollWidth: 58 });
  }
}

settingsRouter.get("/settings", async (_req, res) => {
  try {
    await ensureSettingsRow();
    const rows = await db.select().from(dtfGlobalSettings).where(eq(dtfGlobalSettings.id, 1));
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /settings error:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

settingsRouter.put("/settings", async (req, res) => {
  try {
    const { pricePerMeter, rollWidth } = req.body as { pricePerMeter?: number; rollWidth?: number };

    if (pricePerMeter !== undefined && (typeof pricePerMeter !== "number" || pricePerMeter <= 0)) {
      res.status(400).json({ error: "Invalid pricePerMeter" });
      return;
    }
    if (rollWidth !== undefined && (typeof rollWidth !== "number" || rollWidth <= 0)) {
      res.status(400).json({ error: "Invalid rollWidth" });
      return;
    }

    await ensureSettingsRow();

    const updated = await db
      .update(dtfGlobalSettings)
      .set({
        ...(pricePerMeter !== undefined && { pricePerMeter }),
        ...(rollWidth !== undefined && { rollWidth }),
      })
      .where(eq(dtfGlobalSettings.id, 1))
      .returning();

    res.json(updated[0]);
  } catch (err) {
    console.error("PUT /settings error:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default settingsRouter;
