import { Router } from "express";
import { db, clients, orders } from "@workspace/db";
import { eq, and, isNull, desc, asc, ilike, or, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const clientsRouter = Router();

clientsRouter.get("/clients", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(clients.userId, userId), isNull(clients.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(clients.name, `%${search}%`),
          ilike(clients.email, `%${search}%`),
          ilike(clients.businessName, `%${search}%`),
          ilike(clients.phone, `%${search}%`),
        )!
      );
    }

    const where = and(...conditions);

    function getSortOrder() {
      const dir = sortDir === "asc" ? asc : desc;
      switch (sortBy) {
        case "name": return dir(clients.name);
        default: return dir(clients.createdAt);
      }
    }

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(clients)
        .where(where)
        .orderBy(getSortOrder())
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(where),
    ]);

    const clientIds = items.map((c) => c.id);
    let metricsMap: Record<number, { orderCount: number; totalRevenue: string }> = {};
    if (clientIds.length > 0) {
      const metrics = await db
        .select({
          clientId: orders.clientId,
          orderCount: sql<number>`count(*)::int`,
          totalRevenue: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
        })
        .from(orders)
        .where(and(
          sql`${orders.clientId} IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)})`,
          eq(orders.userId, userId),
          isNull(orders.deletedAt),
        ))
        .groupBy(orders.clientId);

      for (const m of metrics) {
        if (m.clientId != null) {
          metricsMap[m.clientId] = { orderCount: m.orderCount, totalRevenue: m.totalRevenue };
        }
      }
    }

    const clientsWithMetrics = items.map((c) => ({
      ...c,
      orderCount: metricsMap[c.id]?.orderCount ?? 0,
      totalRevenue: metricsMap[c.id]?.totalRevenue ?? "0",
    }));

    res.json({
      clients: clientsWithMetrics,
      total: countResult[0].count,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].count / limit),
    });
  } catch (err) {
    console.error("GET /clients error:", err);
    res.status(500).json({ error: "Error al obtener clientes" });
  }
});

clientsRouter.get("/clients/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const clientId = Number(req.params.id);
    if (isNaN(clientId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId), isNull(clients.deletedAt)));

    if (!client) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

    const clientOrders = await db
      .select()
      .from(orders)
      .where(and(eq(orders.clientId, clientId), eq(orders.userId, userId), isNull(orders.deletedAt)))
      .orderBy(desc(orders.createdAt))
      .limit(20);

    const [statsResult] = await db
      .select({
        orderCount: sql<number>`count(*)::int`,
        totalRevenue: sql<string>`coalesce(sum(${orders.totalPrice}), 0)`,
      })
      .from(orders)
      .where(and(eq(orders.clientId, clientId), eq(orders.userId, userId), isNull(orders.deletedAt)));

    res.json({
      client,
      orders: clientOrders,
      stats: {
        orderCount: statsResult.orderCount,
        totalRevenue: statsResult.totalRevenue,
      },
    });
  } catch (err) {
    console.error("GET /clients/:id error:", err);
    res.status(500).json({ error: "Error al obtener cliente" });
  }
});

clientsRouter.post("/clients", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { name, email, phone, businessName, notes } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Nombre es requerido" });
      return;
    }

    const [client] = await db
      .insert(clients)
      .values({
        userId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        businessName: businessName?.trim() || null,
        notes: notes?.trim() || null,
      })
      .returning();

    res.status(201).json({ client });
  } catch (err) {
    console.error("POST /clients error:", err);
    res.status(500).json({ error: "Error al crear cliente" });
  }
});

clientsRouter.put("/clients/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const clientId = Number(req.params.id);
    if (isNaN(clientId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const [existing] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId), isNull(clients.deletedAt)));

    if (!existing) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

    const { name, email, phone, businessName, notes } = req.body;
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
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    const [client] = await db
      .update(clients)
      .set(updates)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
      .returning();

    res.json({ client });
  } catch (err) {
    console.error("PUT /clients/:id error:", err);
    res.status(500).json({ error: "Error al actualizar cliente" });
  }
});

clientsRouter.delete("/clients/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const clientId = Number(req.params.id);
    if (isNaN(clientId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const [existing] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId), isNull(clients.deletedAt)));

    if (!existing) { res.status(404).json({ error: "Cliente no encontrado" }); return; }

    await db
      .update(clients)
      .set({ deletedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.userId, userId)));

    res.json({ message: "Cliente eliminado" });
  } catch (err) {
    console.error("DELETE /clients/:id error:", err);
    res.status(500).json({ error: "Error al eliminar cliente" });
  }
});

export default clientsRouter;
