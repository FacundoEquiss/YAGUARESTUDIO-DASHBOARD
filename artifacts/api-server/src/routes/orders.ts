import { Router } from "express";
import { db, orders, orderCosts, clients, transactions } from "@workspace/db";
import { eq, and, isNull, desc, asc, ilike, sql, or } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

async function validateClientOwnership(clientId: number, userId: number): Promise<boolean> {
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId), isNull(clients.deletedAt)));
  return !!client;
}

interface CostItemInput {
  title: string;
  amount: number;
}

interface RawOrderFinancialSummary {
  incomeTotal: string;
  expenseTotal: string;
}

function buildOrderFinancialSummary(orderTotal: string, financials?: RawOrderFinancialSummary) {
  const total = Number(orderTotal || 0);
  const paidAmount = Number(financials?.incomeTotal || 0);
  const expenseAmount = Number(financials?.expenseTotal || 0);
  const balanceDue = Math.max(0, total - paidAmount);
  const netResult = paidAmount - expenseAmount;

  return {
    paidAmount: paidAmount.toFixed(2),
    expenseAmount: expenseAmount.toFixed(2),
    balanceDue: balanceDue.toFixed(2),
    netResult: netResult.toFixed(2),
  };
}

async function fetchOrderFinancialSummaries(userId: number, orderIds: number[]) {
  const summaries: Record<number, RawOrderFinancialSummary> = {};

  if (orderIds.length === 0) {
    return summaries;
  }

  const rows = await db
    .select({
      orderId: transactions.orderId,
      incomeTotal: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expenseTotal: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        isNull(transactions.deletedAt),
        sql`${transactions.orderId} IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})`,
      ),
    )
    .groupBy(transactions.orderId);

  for (const row of rows) {
    if (row.orderId != null) {
      summaries[row.orderId] = {
        incomeTotal: row.incomeTotal,
        expenseTotal: row.expenseTotal,
      };
    }
  }

  return summaries;
}

const ordersRouter = Router();

const VALID_STATUSES = ["nuevo", "en_proceso", "listo", "entregado", "cancelado"] as const;
type OrderStatus = (typeof VALID_STATUSES)[number];

ordersRouter.get("/orders", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(orders.userId, userId), isNull(orders.deletedAt)];

    if (status && VALID_STATUSES.includes(status as OrderStatus)) {
      conditions.push(eq(orders.status, status));
    }

    if (search) {
      conditions.push(
        or(
          ilike(orders.clientName, `%${search}%`),
          ilike(orders.description, `%${search}%`),
          ilike(orders.title, `%${search}%`),
        )!
      );
    }

    const where = and(...conditions);

    function getSortOrder() {
      const dir = sortDir === "asc" ? asc : desc;
      switch (sortBy) {
        case "dueDate": return dir(orders.dueDate);
        case "totalPrice": return dir(orders.totalPrice);
        case "clientName": return dir(orders.clientName);
        default: return dir(orders.createdAt);
      }
    }
    const orderFn = getSortOrder();

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(where)
        .orderBy(orderFn)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(where),
    ]);

    const orderIds = items.map((o) => o.id);
    let costsMap: Record<number, Array<{ id: number; title: string; amount: string }>> = {};
    if (orderIds.length > 0) {
      const allCosts = await db
        .select()
        .from(orderCosts)
        .where(sql`${orderCosts.orderId} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`);
      for (const c of allCosts) {
        if (!costsMap[c.orderId]) costsMap[c.orderId] = [];
        costsMap[c.orderId].push({ id: c.id, title: c.title, amount: c.amount });
      }
    }

    const financialsMap = await fetchOrderFinancialSummaries(userId, orderIds);

    const ordersWithCosts = items.map((o) => ({
      ...o,
      costItems: costsMap[o.id] || [],
      ...buildOrderFinancialSummary(o.totalPrice, financialsMap[o.id]),
    }));

    res.json({
      orders: ordersWithCosts,
      total: countResult[0].count,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].count / limit),
    });
  } catch (err) {
    console.error("GET /orders error:", err);
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
});

ordersRouter.get("/orders/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const base = and(eq(orders.userId, userId), isNull(orders.deletedAt));

    const [activeResult, monthResult] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(
          and(
            base,
            or(
              eq(orders.status, "nuevo"),
              eq(orders.status, "en_proceso"),
              eq(orders.status, "listo"),
            ),
          )
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(
          and(
            base,
            sql`${orders.createdAt} >= date_trunc('month', now())`,
          )
        ),
    ]);

    res.json({
      activeOrders: activeResult[0].count,
      monthOrders: monthResult[0].count,
    });
  } catch (err) {
    console.error("GET /orders/stats error:", err);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

ordersRouter.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);

    if (isNaN(orderId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.userId, userId),
          isNull(orders.deletedAt),
        )
      );

    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const costs = await db
      .select()
      .from(orderCosts)
      .where(eq(orderCosts.orderId, orderId));

    const financialsMap = await fetchOrderFinancialSummaries(userId, [orderId]);

    res.json({
      order: {
        ...order,
        costItems: costs.map((c) => ({ id: c.id, title: c.title, amount: c.amount })),
        ...buildOrderFinancialSummary(order.totalPrice, financialsMap[order.id]),
      },
    });
  } catch (err) {
    console.error("GET /orders/:id error:", err);
    res.status(500).json({ error: "Error al obtener pedido" });
  }
});

ordersRouter.post("/orders", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { clientName, clientId, title, description, quantity, unitPrice, totalPrice, status, dueDate, notes, costItems } = req.body;

    if (!clientName || typeof clientName !== "string" || clientName.trim().length === 0) {
      res.status(400).json({ error: "Nombre de cliente es requerido" });
      return;
    }

    let validClientId: number | null = null;
    if (clientId != null && clientId !== "") {
      const parsed = Number(clientId);
      if (isNaN(parsed) || parsed <= 0) {
        res.status(400).json({ error: "ID de cliente inválido" });
        return;
      }
      const owns = await validateClientOwnership(parsed, userId);
      if (!owns) {
        res.status(400).json({ error: "Cliente no encontrado" });
        return;
      }
      validClientId = parsed;
    }

    const parsedCostItems: CostItemInput[] = [];
    if (Array.isArray(costItems)) {
      for (const ci of costItems) {
        if (ci.title && typeof ci.title === "string" && ci.title.trim().length > 0) {
          parsedCostItems.push({
            title: ci.title.trim(),
            amount: Math.max(0, Number(ci.amount) || 0),
          });
        }
      }
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const uPrice = Math.max(0, Number(unitPrice) || 0);
    let tPrice: number;
    if (parsedCostItems.length > 0) {
      tPrice = parsedCostItems.reduce((sum, ci) => sum + ci.amount, 0);
    } else {
      tPrice = totalPrice != null ? Math.max(0, Number(totalPrice)) : qty * uPrice;
    }
    const orderStatus = VALID_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : "nuevo";

    const [order] = await db
      .insert(orders)
      .values({
        userId,
        clientId: validClientId,
        clientName: clientName.trim(),
        title: title?.trim() || null,
        description: description?.trim() || null,
        quantity: qty,
        unitPrice: uPrice.toFixed(2),
        totalPrice: tPrice.toFixed(2),
        status: orderStatus,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes?.trim() || null,
      })
      .returning();

    let insertedCosts: Array<{ id: number; title: string; amount: string }> = [];
    if (parsedCostItems.length > 0) {
      const rows = await db
        .insert(orderCosts)
        .values(
          parsedCostItems.map((ci) => ({
            orderId: order.id,
            title: ci.title,
            amount: ci.amount.toFixed(2),
          }))
        )
        .returning();
      insertedCosts = rows.map((r) => ({ id: r.id, title: r.title, amount: r.amount }));
    }

    res.status(201).json({
      order: {
        ...order,
        costItems: insertedCosts,
        ...buildOrderFinancialSummary(order.totalPrice),
      },
    });
  } catch (err) {
    console.error("POST /orders error:", err);
    res.status(500).json({ error: "Error al crear pedido" });
  }
});

ordersRouter.put("/orders/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);

    if (isNaN(orderId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.userId, userId),
          isNull(orders.deletedAt),
        )
      );

    if (!existing) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const { clientName, clientId, title, description, quantity, unitPrice, totalPrice, status, dueDate, notes, costItems } = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (clientId !== undefined) {
      if (clientId == null || clientId === "") {
        updates.clientId = null;
      } else {
        const parsed = Number(clientId);
        if (isNaN(parsed) || parsed <= 0) {
          res.status(400).json({ error: "ID de cliente inválido" });
          return;
        }
        const owns = await validateClientOwnership(parsed, userId);
        if (!owns) {
          res.status(400).json({ error: "Cliente no encontrado" });
          return;
        }
        updates.clientId = parsed;
      }
    }

    if (clientName !== undefined) {
      if (typeof clientName !== "string" || clientName.trim().length === 0) {
        res.status(400).json({ error: "Nombre de cliente es requerido" });
        return;
      }
      updates.clientName = clientName.trim();
    }
    if (title !== undefined) updates.title = title?.trim() || null;
    if (description !== undefined) updates.description = description?.trim() || null;
    if (quantity !== undefined) updates.quantity = Math.max(1, Number(quantity) || 1);
    if (unitPrice !== undefined) updates.unitPrice = Math.max(0, Number(unitPrice) || 0).toFixed(2);
    if (status !== undefined && VALID_STATUSES.includes(status as OrderStatus)) updates.status = status;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    let updatedCosts: Array<{ id: number; title: string; amount: string }> = [];
    if (Array.isArray(costItems)) {
      const parsedCostItems: CostItemInput[] = [];
      for (const ci of costItems) {
        if (ci.title && typeof ci.title === "string" && ci.title.trim().length > 0) {
          parsedCostItems.push({
            title: ci.title.trim(),
            amount: Math.max(0, Number(ci.amount) || 0),
          });
        }
      }

      await db.delete(orderCosts).where(eq(orderCosts.orderId, orderId));

      if (parsedCostItems.length > 0) {
        const rows = await db
          .insert(orderCosts)
          .values(
            parsedCostItems.map((ci) => ({
              orderId,
              title: ci.title,
              amount: ci.amount.toFixed(2),
            }))
          )
          .returning();
        updatedCosts = rows.map((r) => ({ id: r.id, title: r.title, amount: r.amount }));
      }

      const costTotal = parsedCostItems.reduce((sum, ci) => sum + ci.amount, 0);
      updates.totalPrice = costTotal.toFixed(2);
    } else if (totalPrice !== undefined) {
      updates.totalPrice = Math.max(0, Number(totalPrice) || 0).toFixed(2);
    }

    const [order] = await db
      .update(orders)
      .set(updates)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .returning();

    if (!Array.isArray(costItems)) {
      const existingCosts = await db
        .select()
        .from(orderCosts)
        .where(eq(orderCosts.orderId, orderId));
      updatedCosts = existingCosts.map((r) => ({ id: r.id, title: r.title, amount: r.amount }));
    }

    res.json({
      order: {
        ...order,
        costItems: updatedCosts,
        ...buildOrderFinancialSummary(String(order.totalPrice ?? existing.totalPrice)),
      },
    });
  } catch (err) {
    console.error("PUT /orders/:id error:", err);
    res.status(500).json({ error: "Error al actualizar pedido" });
  }
});

ordersRouter.delete("/orders/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);

    if (isNaN(orderId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.userId, userId),
          isNull(orders.deletedAt),
        )
      );

    if (!existing) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    await db
      .update(orders)
      .set({ deletedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));

    res.json({ message: "Pedido eliminado" });
  } catch (err) {
    console.error("DELETE /orders/:id error:", err);
    res.status(500).json({ error: "Error al eliminar pedido" });
  }
});

export default ordersRouter;
