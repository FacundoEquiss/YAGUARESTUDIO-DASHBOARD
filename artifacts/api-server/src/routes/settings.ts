import { Router } from "express";
import { db, dtfGlobalSettings, userDtfSettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

type GlobalSettingsRow = typeof dtfGlobalSettings.$inferSelect;

type UserDtfSettingsUpdate = Partial<Pick<
  typeof userDtfSettings.$inferInsert,
  "pricePerMeter" | "rollWidth" | "baseMargin" | "wholesaleMargin" |
  "pressPassThreshold" | "pressPassExtraCost" | "talleEnabled" | "talleSurcharge"
>> & { updatedAt?: Date };

const settingsRouter = Router();

/**
 * Ensures the single global settings row (id=1) exists.
 * Returns it whether it was just created or already existed.
 */
async function ensureSettingsRow(): Promise<GlobalSettingsRow> {
  const rows = await db.select().from(dtfGlobalSettings).where(eq(dtfGlobalSettings.id, 1));
  if (rows.length > 0) {
    return rows[0];
  }
  const inserted = await db
    .insert(dtfGlobalSettings)
    .values({ id: 1, pricePerMeter: 10000, rollWidth: 58 })
    .returning();
  return inserted[0];
}

settingsRouter.get("/settings", async (_req, res) => {
  try {
    const row = await ensureSettingsRow();
    res.json(row);
  } catch (err) {
    console.error("GET /settings error:", err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

settingsRouter.put("/settings", requireAuth, async (req, res) => {
  try {
    if (req.user!.role !== "master") {
      res.status(403).json({ error: "Solo el administrador puede modificar configuración global" });
      return;
    }
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

settingsRouter.get("/user-settings", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const rows = await db.select().from(userDtfSettings).where(eq(userDtfSettings.userId, userId));

    if (rows.length > 0) {
      res.json(rows[0]);
      return;
    }

    const global = await ensureSettingsRow();
    res.json({
      id: null,
      userId,
      pricePerMeter: global.pricePerMeter,
      rollWidth: global.rollWidth,
      baseMargin: 2000,
      wholesaleMargin: 1200,
      pressPassThreshold: 2,
      pressPassExtraCost: 800,
      talleEnabled: false,
      talleSurcharge: 0,
    });
  } catch (err) {
    console.error("GET /user-settings error:", err);
    res.status(500).json({ error: "Failed to fetch user settings" });
  }
});

settingsRouter.put("/user-settings", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const {
      pricePerMeter,
      rollWidth,
      baseMargin,
      wholesaleMargin,
      pressPassThreshold,
      pressPassExtraCost,
      talleEnabled,
      talleSurcharge,
    } = req.body;

    if (pricePerMeter !== undefined && (typeof pricePerMeter !== "number" || pricePerMeter <= 0)) {
      res.status(400).json({ error: "Invalid pricePerMeter" }); return;
    }
    if (rollWidth !== undefined && (typeof rollWidth !== "number" || rollWidth <= 0)) {
      res.status(400).json({ error: "Invalid rollWidth" }); return;
    }
    if (baseMargin !== undefined && (typeof baseMargin !== "number" || baseMargin < 0)) {
      res.status(400).json({ error: "Invalid baseMargin" }); return;
    }
    if (wholesaleMargin !== undefined && (typeof wholesaleMargin !== "number" || wholesaleMargin < 0)) {
      res.status(400).json({ error: "Invalid wholesaleMargin" }); return;
    }
    if (pressPassThreshold !== undefined && (typeof pressPassThreshold !== "number" || pressPassThreshold < 1)) {
      res.status(400).json({ error: "Invalid pressPassThreshold" }); return;
    }
    if (pressPassExtraCost !== undefined && (typeof pressPassExtraCost !== "number" || pressPassExtraCost < 0)) {
      res.status(400).json({ error: "Invalid pressPassExtraCost" }); return;
    }
    if (talleSurcharge !== undefined && (typeof talleSurcharge !== "number" || talleSurcharge < 0)) {
      res.status(400).json({ error: "Invalid talleSurcharge" }); return;
    }

    const existing = await db.select().from(userDtfSettings).where(eq(userDtfSettings.userId, userId));

    const updateData: UserDtfSettingsUpdate = { updatedAt: new Date() };
    if (pricePerMeter !== undefined) updateData.pricePerMeter = pricePerMeter;
    if (rollWidth !== undefined) updateData.rollWidth = rollWidth;
    if (baseMargin !== undefined) updateData.baseMargin = baseMargin;
    if (wholesaleMargin !== undefined) updateData.wholesaleMargin = wholesaleMargin;
    if (pressPassThreshold !== undefined) updateData.pressPassThreshold = pressPassThreshold;
    if (pressPassExtraCost !== undefined) updateData.pressPassExtraCost = pressPassExtraCost;
    if (talleEnabled !== undefined) updateData.talleEnabled = !!talleEnabled;
    if (talleSurcharge !== undefined) updateData.talleSurcharge = talleSurcharge;

    if (existing.length > 0) {
      const updated = await db
        .update(userDtfSettings)
        .set(updateData)
        .where(eq(userDtfSettings.userId, userId))
        .returning();
      res.json(updated[0]);
    } else {
      const globalRow = await ensureSettingsRow();
      // globalRow is guaranteed non-null — ensureSettingsRow() always returns the row
      const inserted = await db
        .insert(userDtfSettings)
        .values({
          userId,
          pricePerMeter: pricePerMeter ?? globalRow.pricePerMeter,
          rollWidth: rollWidth ?? globalRow.rollWidth,
          baseMargin: baseMargin ?? 2000,
          wholesaleMargin: wholesaleMargin ?? 1200,
          pressPassThreshold: pressPassThreshold ?? 2,
          pressPassExtraCost: pressPassExtraCost ?? 800,
          talleEnabled: talleEnabled ?? false,
          talleSurcharge: talleSurcharge ?? 0,
          ...updateData,
        })
        .returning();
      res.json(inserted[0]);
    }
  } catch (err) {
    console.error("PUT /user-settings error:", err);
    res.status(500).json({ error: "Failed to update user settings" });
  }
});

export default settingsRouter;
