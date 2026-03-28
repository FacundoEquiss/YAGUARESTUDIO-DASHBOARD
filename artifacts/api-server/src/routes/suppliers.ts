import { Router } from "express";
import { db, suppliers } from "@workspace/db";
import { eq, and, isNull, desc, asc, ilike, or, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const suppliersRouter = Router();

suppliersRouter.get("/suppliers", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const search = req.query.search as string | undefined;
    const category = req.query.category as string | undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(suppliers.userId, userId), isNull(suppliers.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(suppliers.name, `%${search}%`),
          ilike(suppliers.email, `%${search}%`),
          ilike(suppliers.businessName, `%${search}%`),
          ilike(suppliers.phone, `%${search}%`),
        )!
      );
    }

    if (category) {
      conditions.push(eq(suppliers.category, category));
    }

    const where = and(...conditions);

    function getSortOrder() {
      const dir = sortDir === "asc" ? asc : desc;
      switch (sortBy) {
        case "name": return dir(suppliers.name);
        case "category": return dir(suppliers.category);
        default: return dir(suppliers.createdAt);
      }
    }

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(suppliers)
        .where(where)
        .orderBy(getSortOrder())
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(suppliers)
        .where(where),
    ]);

    res.json({
      suppliers: items,
      total: countResult[0].count,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].count / limit),
    });
  } catch (err) {
    console.error("GET /suppliers error:", err);
    res.status(500).json({ error: "Error al obtener proveedores" });
  }
});

suppliersRouter.get("/suppliers/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId), isNull(suppliers.deletedAt)));

    if (!supplier) { res.status(404).json({ error: "Proveedor no encontrado" }); return; }

    res.json({ supplier });
  } catch (err) {
    console.error("GET /suppliers/:id error:", err);
    res.status(500).json({ error: "Error al obtener proveedor" });
  }
});

suppliersRouter.post("/suppliers", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { name, email, phone, businessName, category, notes } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Nombre es requerido" });
      return;
    }

    const [supplier] = await db
      .insert(suppliers)
      .values({
        userId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        businessName: businessName?.trim() || null,
        category: category?.trim() || null,
        notes: notes?.trim() || null,
      })
      .returning();

    res.status(201).json({ supplier });
  } catch (err) {
    console.error("POST /suppliers error:", err);
    res.status(500).json({ error: "Error al crear proveedor" });
  }
});

suppliersRouter.put("/suppliers/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const [existing] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId), isNull(suppliers.deletedAt)));

    if (!existing) { res.status(404).json({ error: "Proveedor no encontrado" }); return; }

    const { name, email, phone, businessName, category, notes } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: "Nombre es requerido" });
        return;
      }
      updates.name = name.trim();
    }
    if (email !== undefined) updates.email = email?.trim() || null;
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (businessName !== undefined) updates.businessName = businessName?.trim() || null;
    if (category !== undefined) updates.category = category?.trim() || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    const [supplier] = await db
      .update(suppliers)
      .set(updates)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId)))
      .returning();

    res.json({ supplier });
  } catch (err) {
    console.error("PUT /suppliers/:id error:", err);
    res.status(500).json({ error: "Error al actualizar proveedor" });
  }
});

suppliersRouter.delete("/suppliers/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const supplierId = Number(req.params.id);
    if (isNaN(supplierId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const [existing] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId), isNull(suppliers.deletedAt)));

    if (!existing) { res.status(404).json({ error: "Proveedor no encontrado" }); return; }

    await db
      .update(suppliers)
      .set({ deletedAt: new Date() })
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId)));

    res.json({ message: "Proveedor eliminado" });
  } catch (err) {
    console.error("DELETE /suppliers/:id error:", err);
    res.status(500).json({ error: "Error al eliminar proveedor" });
  }
});

export default suppliersRouter;
