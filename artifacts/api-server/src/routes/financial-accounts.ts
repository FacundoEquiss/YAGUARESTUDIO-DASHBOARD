import { Router } from "express";
import { db, financialAccounts, transactions } from "@workspace/db";
import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const financialAccountsRouter = Router();

financialAccountsRouter.get("/financial-accounts", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";

    const conditions = [eq(financialAccounts.userId, userId), isNull(financialAccounts.deletedAt)];

    if (search) {
      conditions.push(
        or(
          ilike(financialAccounts.name, `%${search}%`),
          ilike(financialAccounts.accountType, `%${search}%`),
        )!,
      );
    }

    const where = and(...conditions);
    const sortOrder = (() => {
      const dir = sortDir === "asc" ? asc : desc;
      switch (sortBy) {
        case "name":
          return dir(financialAccounts.name);
        case "accountType":
          return dir(financialAccounts.accountType);
        default:
          return dir(financialAccounts.createdAt);
      }
    })();

    const accounts = await db
      .select()
      .from(financialAccounts)
      .where(where)
      .orderBy(sortOrder);

    const accountIds = accounts.map((account) => account.id);
    const transactionRows = accountIds.length > 0
      ? await db
          .select({
            financialAccountId: transactions.financialAccountId,
            incomeTotal: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
            expenseTotal: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
            transactionCount: sql<number>`count(*)::int`,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, userId),
              isNull(transactions.deletedAt),
              sql`${transactions.financialAccountId} IN (${sql.join(accountIds.map((id) => sql`${id}`), sql`, `)})`,
            ),
          )
          .groupBy(transactions.financialAccountId)
      : [];

    const txMap = new Map<number, { incomeTotal: string; expenseTotal: string; transactionCount: number }>();
    for (const row of transactionRows) {
      if (row.financialAccountId != null) {
        txMap.set(row.financialAccountId, {
          incomeTotal: row.incomeTotal,
          expenseTotal: row.expenseTotal,
          transactionCount: row.transactionCount,
        });
      }
    }

    const items = accounts.map((account) => {
      const totals = txMap.get(account.id);
      const openingBalance = Number(account.openingBalance || 0);
      const incomeTotal = Number(totals?.incomeTotal || 0);
      const expenseTotal = Number(totals?.expenseTotal || 0);
      const currentBalance = openingBalance + incomeTotal - expenseTotal;

      return {
        ...account,
        incomeTotal: incomeTotal.toFixed(2),
        expenseTotal: expenseTotal.toFixed(2),
        currentBalance: currentBalance.toFixed(2),
        transactionCount: totals?.transactionCount || 0,
      };
    });

    res.json({ accounts: items });
  } catch (err) {
    console.error("GET /financial-accounts error:", err);
    res.status(500).json({ error: "Error al obtener cuentas financieras" });
  }
});

financialAccountsRouter.post("/financial-accounts", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { name, accountType, currency, openingBalance, notes, isActive } = req.body as {
      name?: string;
      accountType?: string;
      currency?: string;
      openingBalance?: number | string;
      notes?: string;
      isActive?: boolean;
    };

    if (!name || !name.trim()) {
      res.status(400).json({ error: "El nombre de la cuenta es obligatorio" });
      return;
    }

    const [account] = await db
      .insert(financialAccounts)
      .values({
        userId,
        name: name.trim(),
        accountType: accountType?.trim() || "cash",
        currency: currency?.trim() || "ARS",
        openingBalance: Math.max(0, Number(openingBalance) || 0).toFixed(2),
        notes: notes?.trim() || null,
        isActive: isActive ?? true,
      })
      .returning();

    res.status(201).json({ account });
  } catch (err) {
    console.error("POST /financial-accounts error:", err);
    res.status(500).json({ error: "Error al crear cuenta financiera" });
  }
});

financialAccountsRouter.put("/financial-accounts/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const accountId = Number(req.params.id);

    if (isNaN(accountId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(financialAccounts)
      .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId), isNull(financialAccounts.deletedAt)));

    if (!existing) {
      res.status(404).json({ error: "Cuenta financiera no encontrada" });
      return;
    }

    const { name, accountType, currency, openingBalance, notes, isActive } = req.body as {
      name?: string;
      accountType?: string;
      currency?: string;
      openingBalance?: number | string;
      notes?: string;
      isActive?: boolean;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) {
      if (!name.trim()) {
        res.status(400).json({ error: "El nombre de la cuenta es obligatorio" });
        return;
      }
      updates.name = name.trim();
    }
    if (accountType !== undefined) updates.accountType = accountType.trim() || "cash";
    if (currency !== undefined) updates.currency = currency.trim() || "ARS";
    if (openingBalance !== undefined) updates.openingBalance = Math.max(0, Number(openingBalance) || 0).toFixed(2);
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (isActive !== undefined) updates.isActive = isActive;

    const [account] = await db
      .update(financialAccounts)
      .set(updates)
      .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)))
      .returning();

    res.json({ account });
  } catch (err) {
    console.error("PUT /financial-accounts/:id error:", err);
    res.status(500).json({ error: "Error al actualizar cuenta financiera" });
  }
});

financialAccountsRouter.delete("/financial-accounts/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const accountId = Number(req.params.id);

    if (isNaN(accountId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(financialAccounts)
      .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId), isNull(financialAccounts.deletedAt)));

    if (!existing) {
      res.status(404).json({ error: "Cuenta financiera no encontrada" });
      return;
    }

    await db
      .update(financialAccounts)
      .set({ deletedAt: new Date(), updatedAt: new Date(), isActive: false })
      .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.userId, userId)));

    res.json({ message: "Cuenta financiera eliminada" });
  } catch (err) {
    console.error("DELETE /financial-accounts/:id error:", err);
    res.status(500).json({ error: "Error al eliminar cuenta financiera" });
  }
});

export default financialAccountsRouter;
