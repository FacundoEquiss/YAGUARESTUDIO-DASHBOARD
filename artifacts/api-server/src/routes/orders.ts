import { Router } from "express";
import {
  db,
  orders,
  orderItems,
  orderPayments,
  clients,
  transactions,
  products,
  productStockMovements,
  financialAccounts,
  services,
  suppliers,
} from "@workspace/db";
import { eq, and, isNull, desc, asc, ilike, sql, or } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { calculateDtfPricingForUser, DtfPricingError, type DtfPricingInput } from "../lib/dtf-pricing";

const ordersRouter = Router();

const VALID_STATUSES = ["nuevo", "en_proceso", "listo", "entregado", "cancelado"] as const;
const VALID_LINE_TYPES = [
  "quote_dtf_line",
  "product_line",
  "service_line",
  "manual_line",
  "pass_through_line",
  "legacy_cost",
] as const;
const VALID_SOURCE_TYPES = ["product", "service", "quote", "manual", "legacy"] as const;
const VALID_PAYMENT_METHODS = ["cash", "mercado_pago", "bank_transfer", "debit_card", "credit_card", "other", "legacy"] as const;
const VALID_FINANCIAL_STATUSES = ["pending", "partial", "paid"] as const;
const EXPENSE_CATEGORIES = ["materiales", "envio", "servicios", "impuestos", "otros"] as const;

type OrderStatus = (typeof VALID_STATUSES)[number];
type LineType = (typeof VALID_LINE_TYPES)[number];
type SourceType = (typeof VALID_SOURCE_TYPES)[number];
type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];
type FinancialStatus = (typeof VALID_FINANCIAL_STATUSES)[number];

interface OrderLineInput {
  lineType?: string;
  sourceType?: string | null;
  sourceId?: number | string | null;
  title?: string;
  description?: string;
  quantity?: number | string;
  unitCost?: number | string;
  unitPrice?: number | string;
  totalCost?: number | string;
  totalPrice?: number | string;
  affectsStock?: boolean;
  affectsFinance?: boolean;
  reportArea?: string;
  reportConcept?: string;
  supplierId?: number | string | null;
}

interface NormalizedOrderLine {
  lineType: LineType;
  sourceType: SourceType | null;
  sourceId: number | null;
  title: string;
  description: string | null;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  grossMargin: number;
  affectsStock: boolean;
  affectsFinance: boolean;
  reportArea: string | null;
  reportConcept: string | null;
  supplierId: number | null;
}

interface RawOrderFinancialSummary {
  expenseTotal: string;
}

function toMoney(value: number): string {
  return value.toFixed(2);
}

function parseOptionalDate(value: unknown): Date | null | "invalid" {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return "invalid";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "invalid";
  }

  return parsed;
}

function parsePositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return Math.floor(parsed);
}

function normalizeLineInput(input: OrderLineInput): NormalizedOrderLine | null {
  const title = input.title?.trim();
  if (!title) {
    return null;
  }

  const rawLineType = (input.lineType || "manual_line") as LineType;
  const lineType: LineType = VALID_LINE_TYPES.includes(rawLineType) ? rawLineType : "manual_line";

  const rawSourceType = (input.sourceType || null) as SourceType | null;
  const sourceType: SourceType | null = rawSourceType && VALID_SOURCE_TYPES.includes(rawSourceType) ? rawSourceType : null;
  const sourceId = parsePositiveInt(input.sourceId) || null;

  const quantity = Math.max(0.01, Number(input.quantity) || 1);
  const unitCost = Math.max(0, Number(input.unitCost) || 0);
  const unitPrice = Math.max(0, Number(input.unitPrice) || 0);

  const totalCost = input.totalCost != null
    ? Math.max(0, Number(input.totalCost) || 0)
    : quantity * unitCost;

  const totalPrice = input.totalPrice != null
    ? Math.max(0, Number(input.totalPrice) || 0)
    : quantity * unitPrice;

  const affectsStock = input.affectsStock ?? (lineType === "product_line" || sourceType === "product");
  const affectsFinance = input.affectsFinance ?? true;

  return {
    lineType,
    sourceType,
    sourceId,
    title,
    description: input.description?.trim() || null,
    quantity,
    unitCost,
    unitPrice,
    totalCost,
    totalPrice,
    grossMargin: totalPrice - totalCost,
    affectsStock,
    affectsFinance,
    reportArea: input.reportArea?.trim() || null,
    reportConcept: input.reportConcept?.trim() || null,
    supplierId: parsePositiveInt(input.supplierId) || null,
  };
}

function normalizeLegacyCostItems(costItems: Array<{ title?: string; amount?: number | string }>): NormalizedOrderLine[] {
  const lines: NormalizedOrderLine[] = [];

  for (const ci of costItems) {
    if (!ci.title || typeof ci.title !== "string" || ci.title.trim().length === 0) {
      continue;
    }

    const amount = Math.max(0, Number(ci.amount) || 0);

    lines.push({
      lineType: "manual_line",
      sourceType: "manual",
      sourceId: null,
      title: ci.title.trim(),
      description: null,
      quantity: 1,
      unitCost: 0,
      unitPrice: amount,
      totalCost: 0,
      totalPrice: amount,
      grossMargin: amount,
      affectsStock: false,
      affectsFinance: true,
      reportArea: null,
      reportConcept: null,
      supplierId: null,
    });
  }

  return lines;
}

async function validateClientOwnership(clientId: number, userId: number): Promise<boolean> {
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId), isNull(clients.deletedAt)));
  return !!client;
}

async function validateFinancialAccountOwnership(financialAccountId: number, userId: number): Promise<boolean> {
  const [account] = await db
    .select({ id: financialAccounts.id })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, financialAccountId),
        eq(financialAccounts.userId, userId),
        isNull(financialAccounts.deletedAt),
      ),
    );

  return !!account;
}

async function validateSupplierOwnership(supplierId: number, userId: number): Promise<boolean> {
  const [supplier] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId), isNull(suppliers.deletedAt)));

  return !!supplier;
}

async function validateProductOwnership(productId: number, userId: number): Promise<boolean> {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.userId, userId), isNull(products.deletedAt)));

  return !!product;
}

async function validateServiceOwnership(serviceId: number, userId: number): Promise<boolean> {
  const [service] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.userId, userId), isNull(services.deletedAt)));

  return !!service;
}

async function validateLineOwnership(line: NormalizedOrderLine, userId: number): Promise<boolean> {
  if (line.sourceType === "product" && line.sourceId) {
    return validateProductOwnership(line.sourceId, userId);
  }

  if (line.sourceType === "service" && line.sourceId) {
    return validateServiceOwnership(line.sourceId, userId);
  }

  if (line.supplierId) {
    return validateSupplierOwnership(line.supplierId, userId);
  }

  return true;
}

async function getOwnedOrder(orderId: number, userId: number, executor: any = db) {
  const [order] = await executor
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId), isNull(orders.deletedAt)));

  return order ?? null;
}

function buildOrderFinancialSummary(orderTotal: string, amountPaidValue: string | number, financials?: RawOrderFinancialSummary) {
  const total = Number(orderTotal || 0);
  const paidAmount = Number(amountPaidValue || 0);
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

async function fetchOrderExpenseSummaries(userId: number, orderIds: number[]) {
  const summaries: Record<number, RawOrderFinancialSummary> = {};

  if (orderIds.length === 0) {
    return summaries;
  }

  const rows = await db
    .select({
      orderId: transactions.orderId,
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
      summaries[row.orderId] = { expenseTotal: row.expenseTotal };
    }
  }

  return summaries;
}

async function fetchOrderLineItems(userId: number, orderIds: number[]) {
  const map: Record<number, Array<typeof orderItems.$inferSelect>> = {};

  if (orderIds.length === 0) {
    return map;
  }

  const rows = await db
    .select()
    .from(orderItems)
    .where(
      and(
        eq(orderItems.userId, userId),
        isNull(orderItems.deletedAt),
        sql`${orderItems.orderId} IN (${sql.join(orderIds.map((id) => sql`${id}`), sql`, `)})`,
      ),
    )
    .orderBy(asc(orderItems.createdAt));

  for (const row of rows) {
    if (!map[row.orderId]) {
      map[row.orderId] = [];
    }
    map[row.orderId].push(row);
  }

  return map;
}

function mapOrderForResponse(
  order: typeof orders.$inferSelect,
  lineItems: Array<typeof orderItems.$inferSelect>,
  expenseSummary?: RawOrderFinancialSummary,
) {
  return {
    ...order,
    lineItems,
    costItems: lineItems.map((line) => ({
      id: line.id,
      title: line.title,
      amount: line.totalPrice,
    })),
    ...buildOrderFinancialSummary(order.subtotalPrice || order.totalPrice, order.amountPaid, expenseSummary),
  };
}

async function recalculateOrderAggregates(orderId: number, userId: number, executor: any = db) {
  await executor.execute(
    sql`
      select ${orders.id}
      from ${orders}
      where ${orders.id} = ${orderId}
        and ${orders.userId} = ${userId}
        and ${orders.deletedAt} is null
      for update
    `,
  );

  const [currentOrder] = await executor
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId), isNull(orders.deletedAt)));

  if (!currentOrder) {
    return null;
  }

  const [lineTotals] = await executor
    .select({
      subtotalCost: sql<string>`coalesce(sum(${orderItems.totalCost}), 0)`,
      subtotalPrice: sql<string>`coalesce(sum(${orderItems.totalPrice}), 0)`,
    })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), eq(orderItems.userId, userId), isNull(orderItems.deletedAt)));

  const [paymentTotals] = await executor
    .select({
      amountPaid: sql<string>`coalesce(sum(${orderPayments.amount}), 0)`,
    })
    .from(orderPayments)
    .where(and(eq(orderPayments.orderId, orderId), eq(orderPayments.userId, userId), isNull(orderPayments.deletedAt)));

  const subtotalCost = Number(lineTotals?.subtotalCost || 0);
  const subtotalPrice = Number(lineTotals?.subtotalPrice || 0);
  const amountPaid = Number(paymentTotals?.amountPaid || 0);

  let financialStatus: FinancialStatus = "pending";
  if (amountPaid > 0 && amountPaid < subtotalPrice) {
    financialStatus = "partial";
  }
  if (subtotalPrice > 0 && amountPaid >= subtotalPrice) {
    financialStatus = "paid";
  }

  const quotedTotal = Math.max(Number(currentOrder.quotedTotal || 0), subtotalPrice);

  const [updated] = await executor
    .update(orders)
    .set({
      subtotalCost: toMoney(subtotalCost),
      subtotalPrice: toMoney(subtotalPrice),
      totalPrice: toMoney(subtotalPrice),
      amountPaid: toMoney(amountPaid),
      quotedTotal: toMoney(quotedTotal),
      financialStatus,
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId), isNull(orders.deletedAt)))
    .returning();

  if (!updated) {
    throw new Error(`No se pudo recalcular agregados para pedido ${orderId}`);
  }

  return updated;
}

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
        )!,
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

    const [items, countResult] = await Promise.all([
      db
        .select()
        .from(orders)
        .where(where)
        .orderBy(getSortOrder())
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(where),
    ]);

    const orderIds = items.map((o) => o.id);
    const [lineItemsMap, expenseMap] = await Promise.all([
      fetchOrderLineItems(userId, orderIds),
      fetchOrderExpenseSummaries(userId, orderIds),
    ]);

    const responseOrders = items.map((order) =>
      mapOrderForResponse(order, lineItemsMap[order.id] || [], expenseMap[order.id]),
    );

    res.json({
      orders: responseOrders,
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
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(
          and(
            base,
            sql`${orders.createdAt} >= date_trunc('month', now())`,
          ),
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

    if (Number.isNaN(orderId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const order = await getOwnedOrder(orderId, userId);
    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const [lineItemsMap, expenseMap] = await Promise.all([
      fetchOrderLineItems(userId, [orderId]),
      fetchOrderExpenseSummaries(userId, [orderId]),
    ]);

    res.json({
      order: mapOrderForResponse(order, lineItemsMap[orderId] || [], expenseMap[orderId]),
    });
  } catch (err) {
    console.error("GET /orders/:id error:", err);
    res.status(500).json({ error: "Error al obtener pedido" });
  }
});

ordersRouter.post("/orders", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const {
      clientName,
      clientId,
      title,
      description,
      quantity,
      unitPrice,
      totalPrice,
      status,
      dueDate,
      notes,
      costItems,
      pricingInput,
      lineItems,
      quotedTotal,
      sourceQuoteId,
    } = req.body as {
      clientName?: string;
      clientId?: number | string | null;
      title?: string;
      description?: string;
      quantity?: number | string;
      unitPrice?: number | string;
      totalPrice?: number | string;
      status?: string;
      dueDate?: string | null;
      notes?: string;
      costItems?: Array<{ title?: string; amount?: number | string }>;
      pricingInput?: DtfPricingInput;
      lineItems?: OrderLineInput[];
      quotedTotal?: number | string;
      sourceQuoteId?: string;
    };

    if (!clientName || typeof clientName !== "string" || clientName.trim().length === 0) {
      res.status(400).json({ error: "Nombre de cliente es requerido" });
      return;
    }

    let validClientId: number | null = null;
    if (clientId != null && clientId !== "") {
      const parsed = Number(clientId);
      if (Number.isNaN(parsed) || parsed <= 0) {
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

    let qty = Math.max(1, Number(quantity) || 1);
    let uPrice = Math.max(0, Number(unitPrice) || 0);
    let parsedLineItems: NormalizedOrderLine[] = [];

    if (pricingInput) {
      const pricing = await calculateDtfPricingForUser(userId, pricingInput);
      qty = pricing.garments;
      uPrice = pricing.pricePerGarment;

      parsedLineItems = [
        {
          lineType: "quote_dtf_line",
          sourceType: "quote",
          sourceId: null,
          title: `Cotización DTF (${pricing.linearMeters.toFixed(2)} m)`,
          description: null,
          quantity: pricing.garments,
          unitCost: 0,
          unitPrice: pricing.pricePerGarment,
          totalCost: 0,
          totalPrice: pricing.totalOrder,
          grossMargin: pricing.totalOrder,
          affectsStock: false,
          affectsFinance: true,
          reportArea: null,
          reportConcept: null,
          supplierId: null,
        },
      ];
    } else if (Array.isArray(lineItems) && lineItems.length > 0) {
      parsedLineItems = lineItems
        .map((line) => normalizeLineInput(line))
        .filter((line): line is NormalizedOrderLine => !!line);
    } else if (Array.isArray(costItems) && costItems.length > 0) {
      parsedLineItems = normalizeLegacyCostItems(costItems);
    } else {
      const fallbackTotal = Math.max(0, Number(totalPrice) || (qty * uPrice));
      parsedLineItems = [
        {
          lineType: "manual_line",
          sourceType: "manual",
          sourceId: null,
          title: title?.trim() || "Ítem manual",
          description: description?.trim() || null,
          quantity: qty,
          unitCost: 0,
          unitPrice: uPrice,
          totalCost: 0,
          totalPrice: fallbackTotal,
          grossMargin: fallbackTotal,
          affectsStock: false,
          affectsFinance: true,
          reportArea: null,
          reportConcept: null,
          supplierId: null,
        },
      ];
    }

    if (parsedLineItems.length === 0) {
      res.status(400).json({ error: "Agregá al menos una línea de pedido válida" });
      return;
    }

    for (const line of parsedLineItems) {
      if (!(await validateLineOwnership(line, userId))) {
        res.status(400).json({ error: `Origen de línea inválido para ${line.title}` });
        return;
      }
    }

    const subtotalCost = parsedLineItems.reduce((sum, line) => sum + line.totalCost, 0);
    const subtotalPrice = parsedLineItems.reduce((sum, line) => sum + line.totalPrice, 0);
    const orderStatus = VALID_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : "nuevo";
    const normalizedSourceQuoteId = typeof sourceQuoteId === "string" ? sourceQuoteId.trim() || null : null;
    const normalizedQuotedTotal = Math.max(0, Number(quotedTotal) || subtotalPrice);

    const order = await db.transaction(async (tx) => {
      const parsedDueDate = parseOptionalDate(dueDate);
      if (parsedDueDate === "invalid") {
        throw new Error("invalid_due_date");
      }

      const [created] = await tx
        .insert(orders)
        .values({
          userId,
          clientId: validClientId,
          clientName: clientName.trim(),
          title: title?.trim() || null,
          description: description?.trim() || null,
          quantity: qty,
          unitPrice: toMoney(uPrice),
          totalPrice: toMoney(subtotalPrice),
          quotedTotal: toMoney(normalizedQuotedTotal),
          subtotalCost: toMoney(subtotalCost),
          subtotalPrice: toMoney(subtotalPrice),
          amountPaid: toMoney(0),
          financialStatus: "pending",
          status: orderStatus,
          dueDate: parsedDueDate,
          sourceQuoteId: normalizedSourceQuoteId,
          notes: notes?.trim() || null,
        })
        .returning();

      await tx.insert(orderItems).values(
        parsedLineItems.map((line) => ({
          orderId: created.id,
          userId,
          lineType: line.lineType,
          sourceType: line.sourceType,
          sourceId: line.sourceId,
          title: line.title,
          description: line.description,
          quantity: toMoney(line.quantity),
          unitCost: toMoney(line.unitCost),
          unitPrice: toMoney(line.unitPrice),
          totalCost: toMoney(line.totalCost),
          totalPrice: toMoney(line.totalPrice),
          grossMargin: toMoney(line.grossMargin),
          affectsStock: line.affectsStock,
          affectsFinance: line.affectsFinance,
          reportArea: line.reportArea,
          reportConcept: line.reportConcept,
          supplierId: line.supplierId,
        })),
      );

      return recalculateOrderAggregates(created.id, userId, tx);
    });

    const [lineItemsMap, expenseMap] = await Promise.all([
      fetchOrderLineItems(userId, [order.id]),
      fetchOrderExpenseSummaries(userId, [order.id]),
    ]);

    res.status(201).json({
      order: mapOrderForResponse(order, lineItemsMap[order.id] || [], expenseMap[order.id]),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "invalid_due_date") {
      res.status(400).json({ error: "Fecha de entrega inválida" });
      return;
    }
    if (err instanceof DtfPricingError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("POST /orders error:", err);
    res.status(500).json({ error: "Error al crear pedido" });
  }
});

ordersRouter.put("/orders/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const existing = await getOwnedOrder(orderId, userId);
    if (!existing) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const {
      clientName,
      clientId,
      title,
      description,
      quantity,
      unitPrice,
      totalPrice,
      status,
      dueDate,
      notes,
      costItems,
      pricingInput,
      lineItems,
      quotedTotal,
      sourceQuoteId,
    } = req.body as {
      clientName?: string;
      clientId?: number | string | null;
      title?: string;
      description?: string;
      quantity?: number | string;
      unitPrice?: number | string;
      totalPrice?: number | string;
      status?: string;
      dueDate?: string | null;
      notes?: string;
      costItems?: Array<{ title?: string; amount?: number | string }>;
      pricingInput?: DtfPricingInput;
      lineItems?: OrderLineInput[];
      quotedTotal?: number | string;
      sourceQuoteId?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (clientId !== undefined) {
      if (clientId == null || clientId === "") {
        updates.clientId = null;
      } else {
        const parsed = Number(clientId);
        if (Number.isNaN(parsed) || parsed <= 0) {
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
    if (unitPrice !== undefined) updates.unitPrice = toMoney(Math.max(0, Number(unitPrice) || 0));
    if (totalPrice !== undefined) updates.quotedTotal = toMoney(Math.max(0, Number(totalPrice) || 0));
    if (status !== undefined && VALID_STATUSES.includes(status as OrderStatus)) updates.status = status;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (quotedTotal !== undefined) updates.quotedTotal = toMoney(Math.max(0, Number(quotedTotal) || 0));
    if (sourceQuoteId !== undefined) updates.sourceQuoteId = sourceQuoteId?.trim() || null;

    let parsedLineItems: NormalizedOrderLine[] | null = null;

    if (pricingInput) {
      const pricing = await calculateDtfPricingForUser(userId, pricingInput);
      updates.quantity = pricing.garments;
      updates.unitPrice = toMoney(pricing.pricePerGarment);

      parsedLineItems = [
        {
          lineType: "quote_dtf_line",
          sourceType: "quote",
          sourceId: null,
          title: `Cotización DTF (${pricing.linearMeters.toFixed(2)} m)`,
          description: null,
          quantity: pricing.garments,
          unitCost: 0,
          unitPrice: pricing.pricePerGarment,
          totalCost: 0,
          totalPrice: pricing.totalOrder,
          grossMargin: pricing.totalOrder,
          affectsStock: false,
          affectsFinance: true,
          reportArea: null,
          reportConcept: null,
          supplierId: null,
        },
      ];
    } else if (Array.isArray(lineItems)) {
      parsedLineItems = lineItems
        .map((line) => normalizeLineInput(line))
        .filter((line): line is NormalizedOrderLine => !!line);
    } else if (Array.isArray(costItems)) {
      parsedLineItems = normalizeLegacyCostItems(costItems);
    }

    if (parsedLineItems && parsedLineItems.length === 0) {
      res.status(400).json({ error: "Agregá al menos una línea de pedido válida" });
      return;
    }

    if (parsedLineItems) {
      for (const line of parsedLineItems) {
        if (!(await validateLineOwnership(line, userId))) {
          res.status(400).json({ error: `Origen de línea inválido para ${line.title}` });
          return;
        }
      }
    }

    const order = await db.transaction(async (tx) => {
      if (dueDate !== undefined) {
        const parsedDueDate = parseOptionalDate(dueDate);
        if (parsedDueDate === "invalid") {
          throw new Error("invalid_due_date");
        }
        updates.dueDate = parsedDueDate;
      }

      const [updatedOrder] = await tx
        .update(orders)
        .set(updates)
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
        .returning();

      if (parsedLineItems) {
        await tx.delete(orderItems).where(and(eq(orderItems.orderId, orderId), eq(orderItems.userId, userId)));

        if (parsedLineItems.length > 0) {
          await tx.insert(orderItems).values(
            parsedLineItems.map((line) => ({
              orderId,
              userId,
              lineType: line.lineType,
              sourceType: line.sourceType,
              sourceId: line.sourceId,
              title: line.title,
              description: line.description,
              quantity: toMoney(line.quantity),
              unitCost: toMoney(line.unitCost),
              unitPrice: toMoney(line.unitPrice),
              totalCost: toMoney(line.totalCost),
              totalPrice: toMoney(line.totalPrice),
              grossMargin: toMoney(line.grossMargin),
              affectsStock: line.affectsStock,
              affectsFinance: line.affectsFinance,
              reportArea: line.reportArea,
              reportConcept: line.reportConcept,
              supplierId: line.supplierId,
            })),
          );
        }
      }

      if (!updatedOrder) {
        throw new Error("order_not_found_in_update");
      }

      return recalculateOrderAggregates(orderId, userId, tx);
    });

    const [lineItemsMap, expenseMap] = await Promise.all([
      fetchOrderLineItems(userId, [order.id]),
      fetchOrderExpenseSummaries(userId, [order.id]),
    ]);

    res.json({
      order: mapOrderForResponse(order, lineItemsMap[order.id] || [], expenseMap[order.id]),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "invalid_due_date") {
      res.status(400).json({ error: "Fecha de entrega inválida" });
      return;
    }
    if (err instanceof DtfPricingError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    console.error("PUT /orders/:id error:", err);
    res.status(500).json({ error: "Error al actualizar pedido" });
  }
});

ordersRouter.post("/orders/:id/items", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const order = await getOwnedOrder(orderId, userId);
    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const normalized = normalizeLineInput(req.body as OrderLineInput);
    if (!normalized) {
      res.status(400).json({ error: "Línea inválida" });
      return;
    }

    if (!(await validateLineOwnership(normalized, userId))) {
      res.status(400).json({ error: "Origen de línea inválido" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [item] = await tx
        .insert(orderItems)
        .values({
          orderId,
          userId,
          lineType: normalized.lineType,
          sourceType: normalized.sourceType,
          sourceId: normalized.sourceId,
          title: normalized.title,
          description: normalized.description,
          quantity: toMoney(normalized.quantity),
          unitCost: toMoney(normalized.unitCost),
          unitPrice: toMoney(normalized.unitPrice),
          totalCost: toMoney(normalized.totalCost),
          totalPrice: toMoney(normalized.totalPrice),
          grossMargin: toMoney(normalized.grossMargin),
          affectsStock: normalized.affectsStock,
          affectsFinance: normalized.affectsFinance,
          reportArea: normalized.reportArea,
          reportConcept: normalized.reportConcept,
          supplierId: normalized.supplierId,
        })
        .returning();

      const updatedOrder = await recalculateOrderAggregates(orderId, userId, tx);
      return { item, updatedOrder };
    });

    const [lineItemsMap, expenseMap] = await Promise.all([
      fetchOrderLineItems(userId, [orderId]),
      fetchOrderExpenseSummaries(userId, [orderId]),
    ]);

    res.status(201).json({
      item: result.item,
      order: mapOrderForResponse(result.updatedOrder || order, lineItemsMap[orderId] || [], expenseMap[orderId]),
    });
  } catch (err) {
    console.error("POST /orders/:id/items error:", err);
    res.status(500).json({ error: "Error al agregar línea" });
  }
});

ordersRouter.put("/orders/:id/items/:itemId", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    if (Number.isNaN(orderId) || Number.isNaN(itemId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const order = await getOwnedOrder(orderId, userId);
    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const [existingItem] = await db
      .select()
      .from(orderItems)
      .where(
        and(
          eq(orderItems.id, itemId),
          eq(orderItems.orderId, orderId),
          eq(orderItems.userId, userId),
          isNull(orderItems.deletedAt),
        ),
      );

    if (!existingItem) {
      res.status(404).json({ error: "Línea no encontrada" });
      return;
    }

    const normalized = normalizeLineInput({
      lineType: req.body.lineType ?? existingItem.lineType,
      sourceType: req.body.sourceType ?? existingItem.sourceType,
      sourceId: req.body.sourceId ?? existingItem.sourceId,
      title: req.body.title ?? existingItem.title,
      description: req.body.description ?? existingItem.description,
      quantity: req.body.quantity ?? existingItem.quantity,
      unitCost: req.body.unitCost ?? existingItem.unitCost,
      unitPrice: req.body.unitPrice ?? existingItem.unitPrice,
      totalCost: req.body.totalCost ?? existingItem.totalCost,
      totalPrice: req.body.totalPrice ?? existingItem.totalPrice,
      affectsStock: req.body.affectsStock ?? existingItem.affectsStock,
      affectsFinance: req.body.affectsFinance ?? existingItem.affectsFinance,
      reportArea: req.body.reportArea ?? existingItem.reportArea,
      reportConcept: req.body.reportConcept ?? existingItem.reportConcept,
      supplierId: req.body.supplierId ?? existingItem.supplierId,
    });

    if (!normalized) {
      res.status(400).json({ error: "Línea inválida" });
      return;
    }

    if (!(await validateLineOwnership(normalized, userId))) {
      res.status(400).json({ error: "Origen de línea inválido" });
      return;
    }

    const updatedItem = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(orderItems)
        .set({
          lineType: normalized.lineType,
          sourceType: normalized.sourceType,
          sourceId: normalized.sourceId,
          title: normalized.title,
          description: normalized.description,
          quantity: toMoney(normalized.quantity),
          unitCost: toMoney(normalized.unitCost),
          unitPrice: toMoney(normalized.unitPrice),
          totalCost: toMoney(normalized.totalCost),
          totalPrice: toMoney(normalized.totalPrice),
          grossMargin: toMoney(normalized.grossMargin),
          affectsStock: normalized.affectsStock,
          affectsFinance: normalized.affectsFinance,
          reportArea: normalized.reportArea,
          reportConcept: normalized.reportConcept,
          supplierId: normalized.supplierId,
          updatedAt: new Date(),
        })
        .where(and(eq(orderItems.id, itemId), eq(orderItems.userId, userId)))
        .returning();

      await recalculateOrderAggregates(orderId, userId, tx);
      return updated;
    });

    const [lineItemsMap, expenseMap] = await Promise.all([
      fetchOrderLineItems(userId, [orderId]),
      fetchOrderExpenseSummaries(userId, [orderId]),
    ]);

    const updatedOrder = await getOwnedOrder(orderId, userId);

    res.json({
      item: updatedItem,
      order: updatedOrder
        ? mapOrderForResponse(updatedOrder, lineItemsMap[orderId] || [], expenseMap[orderId])
        : null,
    });
  } catch (err) {
    console.error("PUT /orders/:id/items/:itemId error:", err);
    res.status(500).json({ error: "Error al actualizar línea" });
  }
});

ordersRouter.delete("/orders/:id/items/:itemId", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    if (Number.isNaN(orderId) || Number.isNaN(itemId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const order = await getOwnedOrder(orderId, userId);
    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const [existingItem] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(
        and(
          eq(orderItems.id, itemId),
          eq(orderItems.orderId, orderId),
          eq(orderItems.userId, userId),
          isNull(orderItems.deletedAt),
        ),
      );

    if (!existingItem) {
      res.status(404).json({ error: "Línea no encontrada" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(orderItems)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(orderItems.id, itemId), eq(orderItems.userId, userId)));

      await recalculateOrderAggregates(orderId, userId, tx);
    });

    const [lineItemsMap, expenseMap] = await Promise.all([
      fetchOrderLineItems(userId, [orderId]),
      fetchOrderExpenseSummaries(userId, [orderId]),
    ]);

    const updatedOrder = await getOwnedOrder(orderId, userId);

    res.json({
      message: "Línea eliminada",
      order: updatedOrder
        ? mapOrderForResponse(updatedOrder, lineItemsMap[orderId] || [], expenseMap[orderId])
        : null,
    });
  } catch (err) {
    console.error("DELETE /orders/:id/items/:itemId error:", err);
    res.status(500).json({ error: "Error al eliminar línea" });
  }
});

ordersRouter.post("/orders/:id/payments", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const order = await getOwnedOrder(orderId, userId);
    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const {
      amount,
      financialAccountId,
      paymentMethod,
      paidAt,
      notes,
    } = req.body as {
      amount?: number | string;
      financialAccountId?: number | string | null;
      paymentMethod?: string;
      paidAt?: string;
      notes?: string;
    };

    const parsedAmount = Math.max(0, Number(amount) || 0);
    if (parsedAmount <= 0) {
      res.status(400).json({ error: "El monto debe ser mayor a 0" });
      return;
    }

    const parsedFinancialAccountId = parsePositiveInt(financialAccountId);
    if (parsedFinancialAccountId && !(await validateFinancialAccountOwnership(parsedFinancialAccountId, userId))) {
      res.status(400).json({ error: "Cuenta financiera no encontrada" });
      return;
    }

    const normalizedPaymentMethod: PaymentMethod = VALID_PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)
      ? (paymentMethod as PaymentMethod)
      : "other";

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(orderPayments)
        .values({
          orderId,
          userId,
          clientId: order.clientId,
          financialAccountId: parsedFinancialAccountId,
          paymentMethod: normalizedPaymentMethod,
          amount: toMoney(parsedAmount),
          notes: notes?.trim() || null,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        })
        .returning();

      await tx.insert(transactions).values({
        userId,
        type: "income",
        amount: toMoney(parsedAmount),
        description: notes?.trim() || `Cobro pedido #${orderId}`,
        category: "venta",
        paymentMethod: normalizedPaymentMethod,
        clientId: order.clientId,
        orderId,
        orderPaymentId: payment.id,
        financialAccountId: parsedFinancialAccountId,
        date: paidAt ? new Date(paidAt) : new Date(),
      });

      const updatedOrder = await recalculateOrderAggregates(orderId, userId, tx);
      return { payment, updatedOrder };
    });

    const [lineItemsMap, expenseMap] = await Promise.all([
      fetchOrderLineItems(userId, [orderId]),
      fetchOrderExpenseSummaries(userId, [orderId]),
    ]);

    res.status(201).json({
      payment: result.payment,
      order: mapOrderForResponse(result.updatedOrder || order, lineItemsMap[orderId] || [], expenseMap[orderId]),
    });
  } catch (err) {
    console.error("POST /orders/:id/payments error:", err);
    res.status(500).json({ error: "Error al registrar pago" });
  }
});

ordersRouter.post("/orders/:id/cost-payments", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const order = await getOwnedOrder(orderId, userId);
    if (!order) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const {
      amount,
      category,
      description,
      supplierId,
      financialAccountId,
      paidAt,
      orderItemId,
      paymentMethod,
      reportArea,
      reportConcept,
    } = req.body as {
      amount?: number | string;
      category?: string;
      description?: string;
      supplierId?: number | string | null;
      financialAccountId?: number | string | null;
      paidAt?: string;
      orderItemId?: number | string | null;
      paymentMethod?: string;
      reportArea?: string;
      reportConcept?: string;
    };

    const parsedAmount = Math.max(0, Number(amount) || 0);
    if (parsedAmount <= 0) {
      res.status(400).json({ error: "El monto debe ser mayor a 0" });
      return;
    }

    const normalizedCategory = category || "materiales";
    if (!EXPENSE_CATEGORIES.includes(normalizedCategory as (typeof EXPENSE_CATEGORIES)[number])) {
      res.status(400).json({ error: "Categoría de gasto inválida" });
      return;
    }

    const parsedSupplierId = parsePositiveInt(supplierId);
    if (parsedSupplierId && !(await validateSupplierOwnership(parsedSupplierId, userId))) {
      res.status(400).json({ error: "Proveedor no encontrado" });
      return;
    }

    const parsedFinancialAccountId = parsePositiveInt(financialAccountId);
    if (parsedFinancialAccountId && !(await validateFinancialAccountOwnership(parsedFinancialAccountId, userId))) {
      res.status(400).json({ error: "Cuenta financiera no encontrada" });
      return;
    }

    const parsedOrderItemId = parsePositiveInt(orderItemId);
    if (parsedOrderItemId) {
      const [ownedItem] = await db
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(
          and(
            eq(orderItems.id, parsedOrderItemId),
            eq(orderItems.orderId, orderId),
            eq(orderItems.userId, userId),
            isNull(orderItems.deletedAt),
          ),
        );

      if (!ownedItem) {
        res.status(400).json({ error: "Línea de pedido inválida" });
        return;
      }
    }

    const normalizedPaymentMethod = paymentMethod && VALID_PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)
      ? (paymentMethod as PaymentMethod)
      : null;

    const [expenseTx] = await db
      .insert(transactions)
      .values({
        userId,
        type: "expense",
        amount: toMoney(parsedAmount),
        description: description?.trim() || `Costo pagado pedido #${orderId}`,
        category: normalizedCategory,
        paymentMethod: normalizedPaymentMethod,
        reportArea: reportArea?.trim() || null,
        reportConcept: reportConcept?.trim() || null,
        supplierId: parsedSupplierId,
        orderId,
        orderItemId: parsedOrderItemId,
        financialAccountId: parsedFinancialAccountId,
        date: paidAt ? new Date(paidAt) : new Date(),
      })
      .returning();

    const [lineItemsMap, expenseMap] = await Promise.all([
      fetchOrderLineItems(userId, [orderId]),
      fetchOrderExpenseSummaries(userId, [orderId]),
    ]);
    const refreshedOrder = await getOwnedOrder(orderId, userId);

    res.status(201).json({
      transaction: expenseTx,
      order: refreshedOrder
        ? mapOrderForResponse(refreshedOrder, lineItemsMap[orderId] || [], expenseMap[orderId])
        : null,
    });
  } catch (err) {
    console.error("POST /orders/:id/cost-payments error:", err);
    res.status(500).json({ error: "Error al registrar costo pagado" });
  }
});

ordersRouter.post("/orders/:id/mark-delivered", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const existingOrder = await getOwnedOrder(orderId, userId);
    if (!existingOrder) {
      res.status(404).json({ error: "Pedido no encontrado" });
      return;
    }

    const stockError = await db.transaction(async (tx) => {
      const now = new Date();

      if (!existingOrder.stockAppliedAt) {
        const stockLines = await tx
          .select()
          .from(orderItems)
          .where(
            and(
              eq(orderItems.orderId, orderId),
              eq(orderItems.userId, userId),
              eq(orderItems.affectsStock, true),
              eq(orderItems.sourceType, "product"),
              isNull(orderItems.deletedAt),
            ),
          );

        for (const line of stockLines) {
          const productId = parsePositiveInt(line.sourceId);
          if (!productId) {
            continue;
          }

          const [product] = await tx
            .select()
            .from(products)
            .where(and(eq(products.id, productId), eq(products.userId, userId), isNull(products.deletedAt)));

          if (!product) {
            return `Producto ${productId} no encontrado para aplicar stock`;
          }

          const qtyToDiscount = Math.abs(Number(line.quantity) || 0);
          if (qtyToDiscount <= 0) {
            continue;
          }

          const currentStock = Number(product.currentStock || 0);
          const resultingStock = currentStock - qtyToDiscount;

          if (resultingStock < 0) {
            return `Stock insuficiente para ${product.name}`;
          }

          await tx.insert(productStockMovements).values({
            userId,
            productId,
            supplierId: line.supplierId,
            orderId,
            movementType: "sale",
            quantity: toMoney(-qtyToDiscount),
            unitCost: toMoney(Math.max(0, Number(line.unitCost) || 0)),
            notes: `Descuento automático por entrega de pedido #${orderId}`,
            createdAt: now,
          });

          await tx
            .update(products)
            .set({
              currentStock: toMoney(resultingStock),
              updatedAt: now,
            })
            .where(eq(products.id, productId));
        }
      }

      await tx
        .update(orders)
        .set({
          status: "entregado",
          deliveredAt: now,
          stockAppliedAt: existingOrder.stockAppliedAt ? existingOrder.stockAppliedAt : now,
          updatedAt: now,
        })
        .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));

      return null;
    });

    if (stockError) {
      res.status(400).json({ error: stockError });
      return;
    }

    const [lineItemsMap, expenseMap] = await Promise.all([
      fetchOrderLineItems(userId, [orderId]),
      fetchOrderExpenseSummaries(userId, [orderId]),
    ]);
    const updatedOrder = await getOwnedOrder(orderId, userId);

    res.json({
      order: updatedOrder
        ? mapOrderForResponse(updatedOrder, lineItemsMap[orderId] || [], expenseMap[orderId])
        : null,
    });
  } catch (err) {
    console.error("POST /orders/:id/mark-delivered error:", err);
    res.status(500).json({ error: "Error al marcar pedido como entregado" });
  }
});

ordersRouter.delete("/orders/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const existing = await getOwnedOrder(orderId, userId);

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