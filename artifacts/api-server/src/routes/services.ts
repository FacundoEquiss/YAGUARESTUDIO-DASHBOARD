import { Router } from "express";
import { db, services } from "@workspace/db";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const servicesRouter = Router();

type PricingRuleInput = {
  id?: string;
  label?: string;
  minQty?: number | string;
  maxQty?: number | string | null;
  unitPrice?: number | string;
};

function normalizePricingType(value: unknown): "fixed" | "hourly" | "volume" {
  const normalized = String(value || "fixed").trim().toLowerCase();
  if (normalized === "hourly") return "hourly";
  if (normalized === "volume") return "volume";
  return "fixed";
}

function normalizePricingRules(input: unknown): Array<{ id: string; label: string; minQty: number; maxQty: number | null; unitPrice: number }> {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: Array<{ id: string; label: string; minQty: number; maxQty: number | null; unitPrice: number }> = [];

  for (let index = 0; index < input.length; index += 1) {
    const rule = input[index] as PricingRuleInput;
    const unitPrice = Math.max(0, Number(rule?.unitPrice) || 0);
    const minQty = Math.max(1, Number(rule?.minQty) || 1);
    const rawMax = rule?.maxQty;
    const maxQty = rawMax == null || rawMax === "" ? null : Math.max(minQty, Number(rawMax) || minQty);

    normalized.push({
      id: String(rule?.id || `rule_${index + 1}`),
      label: String(rule?.label || `Tramo ${index + 1}`),
      minQty,
      maxQty,
      unitPrice,
    });
  }

  return normalized.sort((a, b) => a.minQty - b.minQty);
}

servicesRouter.get("/services", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(services.userId, userId), isNull(services.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(services.name, `%${search}%`),
          ilike(services.category, `%${search}%`),
          ilike(services.notes, `%${search}%`),
        )!,
      );
    }

    if (category) {
      conditions.push(eq(services.category, category));
    }

    const where = and(...conditions);

    function getSortOrder() {
      const dir = sortDir === "asc" ? asc : desc;
      switch (sortBy) {
        case "name": return dir(services.name);
        case "category": return dir(services.category);
        default: return dir(services.createdAt);
      }
    }

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(services)
        .where(where)
        .orderBy(getSortOrder())
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(services)
        .where(where),
    ]);

    res.json({
      services: items,
      total: countResult[0].count,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].count / limit),
    });
  } catch (err) {
    console.error("GET /services error:", err);
    res.status(500).json({ error: "Error al obtener servicios" });
  }
});

servicesRouter.post("/services", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const {
      name,
      category,
      pricingType,
      pricingRules,
      unit,
      baseCost,
      suggestedPrice,
      reportArea,
      reportConcept,
      notes,
      isActive,
    } = req.body as {
      name?: string;
      category?: string;
      pricingType?: string;
      pricingRules?: PricingRuleInput[];
      unit?: string;
      baseCost?: number | string;
      suggestedPrice?: number | string;
      reportArea?: string;
      reportConcept?: string;
      notes?: string;
      isActive?: boolean;
    };

    if (!name || !name.trim()) {
      res.status(400).json({ error: "El nombre del servicio es obligatorio" });
      return;
    }

    const normalizedPricingType = normalizePricingType(pricingType);
    const normalizedPricingRules = normalizePricingRules(pricingRules);

    const [service] = await db
      .insert(services)
      .values({
        userId,
        name: name.trim(),
        category: category?.trim() || null,
        pricingType: normalizedPricingType,
        pricingRules: normalizedPricingRules,
        unit: unit?.trim() || "unidad",
        baseCost: Math.max(0, Number(baseCost) || 0).toFixed(2),
        suggestedPrice: Math.max(0, Number(suggestedPrice) || 0).toFixed(2),
        reportArea: reportArea?.trim() || null,
        reportConcept: reportConcept?.trim() || null,
        notes: notes?.trim() || null,
        isActive: isActive ?? true,
      })
      .returning();

    res.status(201).json({ service });
  } catch (err) {
    console.error("POST /services error:", err);
    res.status(500).json({ error: "Error al crear servicio" });
  }
});

servicesRouter.put("/services/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const serviceId = Number(req.params.id);

    if (isNaN(serviceId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.userId, userId), isNull(services.deletedAt)));

    if (!existing) {
      res.status(404).json({ error: "Servicio no encontrado" });
      return;
    }

    const {
      name,
      category,
      pricingType,
      pricingRules,
      unit,
      baseCost,
      suggestedPrice,
      reportArea,
      reportConcept,
      notes,
      isActive,
    } = req.body as {
      name?: string;
      category?: string;
      pricingType?: string;
      pricingRules?: PricingRuleInput[];
      unit?: string;
      baseCost?: number | string;
      suggestedPrice?: number | string;
      reportArea?: string;
      reportConcept?: string;
      notes?: string;
      isActive?: boolean;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ error: "El nombre del servicio es obligatorio" });
        return;
      }
      updates.name = name.trim();
    }
    if (category !== undefined) updates.category = category?.trim() || null;
    if (pricingType !== undefined) updates.pricingType = normalizePricingType(pricingType);
    if (pricingRules !== undefined) updates.pricingRules = normalizePricingRules(pricingRules);
    if (unit !== undefined) updates.unit = unit?.trim() || "unidad";
    if (baseCost !== undefined) updates.baseCost = Math.max(0, Number(baseCost) || 0).toFixed(2);
    if (suggestedPrice !== undefined) updates.suggestedPrice = Math.max(0, Number(suggestedPrice) || 0).toFixed(2);
    if (reportArea !== undefined) updates.reportArea = reportArea?.trim() || null;
    if (reportConcept !== undefined) updates.reportConcept = reportConcept?.trim() || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (isActive !== undefined) updates.isActive = isActive;

    const [service] = await db
      .update(services)
      .set(updates)
      .where(and(eq(services.id, serviceId), eq(services.userId, userId)))
      .returning();

    res.json({ service });
  } catch (err) {
    console.error("PUT /services/:id error:", err);
    res.status(500).json({ error: "Error al actualizar servicio" });
  }
});

servicesRouter.delete("/services/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const serviceId = Number(req.params.id);

    if (isNaN(serviceId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.userId, userId), isNull(services.deletedAt)));

    if (!existing) {
      res.status(404).json({ error: "Servicio no encontrado" });
      return;
    }

    await db
      .update(services)
      .set({ deletedAt: new Date() })
      .where(and(eq(services.id, serviceId), eq(services.userId, userId)));

    res.json({ message: "Servicio eliminado" });
  } catch (err) {
    console.error("DELETE /services/:id error:", err);
    res.status(500).json({ error: "Error al eliminar servicio" });
  }
});

export default servicesRouter;
