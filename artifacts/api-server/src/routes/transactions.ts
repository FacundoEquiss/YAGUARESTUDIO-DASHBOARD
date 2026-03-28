import { Router } from "express";
import { db, transactions, clients, suppliers, orders } from "@workspace/db";
import { eq, and, isNull, desc, asc, ilike, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const transactionsRouter = Router();

const VALID_TYPES = ["income", "expense"] as const;
const INCOME_CATEGORIES = ["venta", "anticipo", "otro"] as const;
const EXPENSE_CATEGORIES = ["materiales", "envio", "servicios", "impuestos", "otros"] as const;
const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

transactionsRouter.get("/transactions", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const type = req.query.type as string | undefined;
    const category = req.query.category as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || "date";
    const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [eq(transactions.userId, userId), isNull(transactions.deletedAt)];

    if (type && VALID_TYPES.includes(type as any)) {
      conditions.push(eq(transactions.type, type));
    }
    if (category) {
      conditions.push(eq(transactions.category, category));
    }
    if (dateFrom) {
      conditions.push(gte(transactions.date, new Date(dateFrom)));
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(transactions.date, to));
    }
    if (search) {
      conditions.push(ilike(transactions.description, `%${search}%`));
    }

    const where = and(...conditions);

    function getSortOrder() {
      const dir = sortDir === "asc" ? asc : desc;
      switch (sortBy) {
        case "amount": return dir(transactions.amount);
        case "category": return dir(transactions.category);
        case "createdAt": return dir(transactions.createdAt);
        default: return dir(transactions.date);
      }
    }

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          type: transactions.type,
          amount: transactions.amount,
          description: transactions.description,
          category: transactions.category,
          clientId: transactions.clientId,
          supplierId: transactions.supplierId,
          orderId: transactions.orderId,
          date: transactions.date,
          createdAt: transactions.createdAt,
          updatedAt: transactions.updatedAt,
          clientName: clients.name,
          supplierName: suppliers.name,
        })
        .from(transactions)
        .leftJoin(clients, eq(transactions.clientId, clients.id))
        .leftJoin(suppliers, eq(transactions.supplierId, suppliers.id))
        .where(where)
        .orderBy(getSortOrder())
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(where),
    ]);

    res.json({
      transactions: items,
      total: countResult[0].count,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].count / limit),
    });
  } catch (err) {
    console.error("GET /transactions error:", err);
    res.status(500).json({ error: "Error al obtener transacciones" });
  }
});

transactionsRouter.get("/transactions/summary", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const baseCond = and(eq(transactions.userId, userId), isNull(transactions.deletedAt));
    const monthCond = and(baseCond, gte(transactions.date, monthStart), lte(transactions.date, nextMonthStart));

    const [monthlyTotals] = await db
      .select({
        totalIncome: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
        totalExpenses: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(monthCond);

    const incomeByCategory = await db
      .select({
        category: transactions.category,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(and(monthCond, eq(transactions.type, "income")))
      .groupBy(transactions.category);

    const expenseByCategory = await db
      .select({
        category: transactions.category,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(and(monthCond, eq(transactions.type, "expense")))
      .groupBy(transactions.category);

    const monthlyChart = await db
      .select({
        month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`,
        income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
        expenses: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(and(baseCond, gte(transactions.date, new Date(now.getFullYear(), now.getMonth() - 5, 1))))
      .groupBy(sql`to_char(${transactions.date}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${transactions.date}, 'YYYY-MM')`);

    res.json({
      monthIncome: monthlyTotals.totalIncome,
      monthExpenses: monthlyTotals.totalExpenses,
      balance: String(Number(monthlyTotals.totalIncome) - Number(monthlyTotals.totalExpenses)),
      incomeByCategory,
      expenseByCategory,
      monthlyChart,
    });
  } catch (err) {
    console.error("GET /transactions/summary error:", err);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
});

transactionsRouter.get("/transactions/balances", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const baseCond = and(eq(transactions.userId, userId), isNull(transactions.deletedAt));

    const clientBalances = await db
      .select({
        clientId: transactions.clientId,
        clientName: clients.name,
        totalInvoiced: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
        totalPaid: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
        transactionCount: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .innerJoin(clients, eq(transactions.clientId, clients.id))
      .where(and(baseCond, sql`${transactions.clientId} IS NOT NULL`))
      .groupBy(transactions.clientId, clients.name);

    const supplierBalances = await db
      .select({
        supplierId: transactions.supplierId,
        supplierName: suppliers.name,
        totalOwed: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
        totalPaid: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
        transactionCount: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .innerJoin(suppliers, eq(transactions.supplierId, suppliers.id))
      .where(and(baseCond, sql`${transactions.supplierId} IS NOT NULL`))
      .groupBy(transactions.supplierId, suppliers.name);

    res.json({ clientBalances, supplierBalances });
  } catch (err) {
    console.error("GET /transactions/balances error:", err);
    res.status(500).json({ error: "Error al obtener saldos" });
  }
});

transactionsRouter.post("/transactions", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { type, amount, description, category, clientId, supplierId, orderId, date } = req.body;

    if (!type || !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: "Tipo inválido (income o expense)" });
      return;
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({ error: "Monto debe ser mayor a 0" });
      return;
    }

    if (!category || !ALL_CATEGORIES.includes(category)) {
      res.status(400).json({ error: "Categoría inválida" });
      return;
    }

    let validClientId: number | null = null;
    if (clientId) {
      const parsed = Number(clientId);
      if (!isNaN(parsed) && parsed > 0) {
        const [c] = await db.select({ id: clients.id }).from(clients)
          .where(and(eq(clients.id, parsed), eq(clients.userId, userId), isNull(clients.deletedAt)));
        if (c) validClientId = parsed;
      }
    }

    let validSupplierId: number | null = null;
    if (supplierId) {
      const parsed = Number(supplierId);
      if (!isNaN(parsed) && parsed > 0) {
        const [s] = await db.select({ id: suppliers.id }).from(suppliers)
          .where(and(eq(suppliers.id, parsed), eq(suppliers.userId, userId), isNull(suppliers.deletedAt)));
        if (s) validSupplierId = parsed;
      }
    }

    let validOrderId: number | null = null;
    if (orderId) {
      const parsed = Number(orderId);
      if (!isNaN(parsed) && parsed > 0) {
        const [o] = await db.select({ id: orders.id }).from(orders)
          .where(and(eq(orders.id, parsed), eq(orders.userId, userId), isNull(orders.deletedAt)));
        if (o) validOrderId = parsed;
      }
    }

    const [tx] = await db
      .insert(transactions)
      .values({
        userId,
        type,
        amount: parsedAmount.toFixed(2),
        description: description?.trim() || null,
        category,
        clientId: validClientId,
        supplierId: validSupplierId,
        orderId: validOrderId,
        date: date ? new Date(date) : new Date(),
      })
      .returning();

    res.status(201).json({ transaction: tx });
  } catch (err) {
    console.error("POST /transactions error:", err);
    res.status(500).json({ error: "Error al crear transacción" });
  }
});

transactionsRouter.put("/transactions/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const txId = Number(req.params.id);
    if (isNaN(txId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const [existing] = await db.select().from(transactions)
      .where(and(eq(transactions.id, txId), eq(transactions.userId, userId), isNull(transactions.deletedAt)));

    if (!existing) { res.status(404).json({ error: "Transacción no encontrada" }); return; }

    const { type, amount, description, category, clientId, supplierId, orderId, date } = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) { res.status(400).json({ error: "Tipo inválido" }); return; }
      updates.type = type;
    }
    if (amount !== undefined) {
      const parsed = Number(amount);
      if (isNaN(parsed) || parsed <= 0) { res.status(400).json({ error: "Monto inválido" }); return; }
      updates.amount = parsed.toFixed(2);
    }
    if (description !== undefined) updates.description = description?.trim() || null;
    if (category !== undefined) {
      if (!ALL_CATEGORIES.includes(category)) { res.status(400).json({ error: "Categoría inválida" }); return; }
      updates.category = category;
    }
    if (clientId !== undefined) {
      if (clientId) {
        const parsed = Number(clientId);
        if (!isNaN(parsed) && parsed > 0) {
          const [c] = await db.select({ id: clients.id }).from(clients)
            .where(and(eq(clients.id, parsed), eq(clients.userId, userId), isNull(clients.deletedAt)));
          if (!c) { res.status(400).json({ error: "Cliente no encontrado" }); return; }
          updates.clientId = parsed;
        }
      } else {
        updates.clientId = null;
      }
    }
    if (supplierId !== undefined) {
      if (supplierId) {
        const parsed = Number(supplierId);
        if (!isNaN(parsed) && parsed > 0) {
          const [s] = await db.select({ id: suppliers.id }).from(suppliers)
            .where(and(eq(suppliers.id, parsed), eq(suppliers.userId, userId), isNull(suppliers.deletedAt)));
          if (!s) { res.status(400).json({ error: "Proveedor no encontrado" }); return; }
          updates.supplierId = parsed;
        }
      } else {
        updates.supplierId = null;
      }
    }
    if (orderId !== undefined) {
      if (orderId) {
        const parsed = Number(orderId);
        if (!isNaN(parsed) && parsed > 0) {
          const [o] = await db.select({ id: orders.id }).from(orders)
            .where(and(eq(orders.id, parsed), eq(orders.userId, userId), isNull(orders.deletedAt)));
          if (!o) { res.status(400).json({ error: "Pedido no encontrado" }); return; }
          updates.orderId = parsed;
        }
      } else {
        updates.orderId = null;
      }
    }
    if (date !== undefined) updates.date = date ? new Date(date) : new Date();

    const [tx] = await db.update(transactions).set(updates)
      .where(and(eq(transactions.id, txId), eq(transactions.userId, userId)))
      .returning();

    res.json({ transaction: tx });
  } catch (err) {
    console.error("PUT /transactions/:id error:", err);
    res.status(500).json({ error: "Error al actualizar transacción" });
  }
});

transactionsRouter.delete("/transactions/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const txId = Number(req.params.id);
    if (isNaN(txId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const [existing] = await db.select().from(transactions)
      .where(and(eq(transactions.id, txId), eq(transactions.userId, userId), isNull(transactions.deletedAt)));

    if (!existing) { res.status(404).json({ error: "Transacción no encontrada" }); return; }

    await db.update(transactions).set({ deletedAt: new Date() })
      .where(and(eq(transactions.id, txId), eq(transactions.userId, userId)));

    res.json({ message: "Transacción eliminada" });
  } catch (err) {
    console.error("DELETE /transactions/:id error:", err);
    res.status(500).json({ error: "Error al eliminar transacción" });
  }
});

export default transactionsRouter;
