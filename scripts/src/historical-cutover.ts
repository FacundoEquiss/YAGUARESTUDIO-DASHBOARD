import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray, isNull, lt } from "../../lib/db/node_modules/drizzle-orm";
import {
  db,
  financialAccounts,
  orderCosts,
  orderItems,
  orderPayments,
  orders,
  pool,
  transactions,
  users,
} from "../../lib/db/src";

type Mode = "dry-run" | "apply";

interface SelectedUser {
  id: number;
  email: string;
  role: string;
}

interface OpeningBalanceAdjustment {
  userId: number;
  financialAccountId: number;
  accountName: string;
  type: "income" | "expense";
  amount: string;
  net: number;
}

interface CutoverDataset {
  ordersToArchive: Array<typeof orders.$inferSelect>;
  orderItemsToArchive: Array<typeof orderItems.$inferSelect>;
  orderPaymentsToArchive: Array<typeof orderPayments.$inferSelect>;
  orderCostsToArchive: Array<typeof orderCosts.$inferSelect>;
  transactionsToArchive: Array<typeof transactions.$inferSelect>;
}

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getMode(): Mode {
  const raw = (process.argv[2] || "dry-run").toLowerCase();
  if (raw !== "dry-run" && raw !== "apply") {
    throw new Error("Usa: dry-run o apply");
  }

  return raw;
}

function parseCutoffDate(): { raw: string; date: Date } {
  const raw = readEnv("CUTOFF_DATE", "CUTOVER_DATE");

  if (!raw) {
    throw new Error("Defini CUTOFF_DATE con formato YYYY-MM-DD.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error(`CUTOFF_DATE invalida: ${raw}. Formato esperado: YYYY-MM-DD`);
  }

  const date = new Date(`${raw}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`No se pudo parsear CUTOFF_DATE: ${raw}`);
  }

  return { raw, date };
}

function getRepoRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), "..", "..");
}

function getArchiveDir(repoRoot: string): string {
  const configured = readEnv("CUTOFF_ARCHIVE_DIR", "CUTOVER_ARCHIVE_DIR") || "artifacts/historical-cutover";

  if (path.isAbsolute(configured)) {
    return configured;
  }

  return path.resolve(repoRoot, configured);
}

function mustConfirmApply(mode: Mode) {
  if (mode !== "apply") {
    return;
  }

  if (process.env.CONFIRM_ORDER_CUTOVER !== "yes") {
    throw new Error("Para aplicar el cutover defini CONFIRM_ORDER_CUTOVER=yes.");
  }
}

function shouldCreateOpeningBalances(): boolean {
  const configured = readEnv("CUTOFF_CREATE_OPENING_BALANCE", "CUTOVER_CREATE_OPENING_BALANCE");
  return configured !== "no";
}

function parseTargetUserId(): number | null {
  const raw = readEnv("CUTOFF_USER_ID", "CUTOVER_USER_ID");
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`CUTOFF_USER_ID invalido: ${raw}`);
  }

  return parsed;
}

async function ensureSchemaReadyForCutover() {
  const required: Record<string, string[]> = {
    orders: ["quoted_total", "subtotal_cost", "subtotal_price", "amount_paid", "financial_status"],
    transactions: ["order_item_id", "order_payment_id", "report_area", "report_concept"],
    order_items: ["line_type", "total_cost", "total_price"],
    order_payments: ["payment_method", "amount", "paid_at"],
  };

  const requiredTables = Object.keys(required);

  const result = await pool.query<{
    table_name: string;
    column_name: string;
  }>(
    `
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
    `,
    [requiredTables],
  );

  const byTable = new Map<string, Set<string>>();

  for (const row of result.rows) {
    const current = byTable.get(row.table_name) || new Set<string>();
    current.add(row.column_name);
    byTable.set(row.table_name, current);
  }

  const missing: Array<{ table: string; columns: string[] }> = [];

  for (const table of requiredTables) {
    const existingColumns = byTable.get(table) || new Set<string>();
    const missingColumns = required[table].filter((column) => !existingColumns.has(column));

    if (missingColumns.length > 0) {
      missing.push({ table, columns: missingColumns });
    }
  }

  if (missing.length > 0) {
    const detail = missing
      .map((entry) => `- ${entry.table}: ${entry.columns.join(", ")}`)
      .join("\n");

    throw new Error(
      [
        "La base de datos no esta en esquema V2 requerido para historical cutover.",
        "Columnas faltantes detectadas:",
        detail,
        "Corre primero: pnpm run db:push (o migraciones equivalentes) y reintenta.",
      ].join("\n"),
    );
  }
}

async function selectUsers(): Promise<SelectedUser[]> {
  const targetUserId = parseTargetUserId();
  const targetUserEmail = readEnv("CUTOFF_USER_EMAIL", "CUTOVER_USER_EMAIL")?.toLowerCase() || null;

  if (targetUserId && targetUserEmail) {
    throw new Error("Usa solo uno: CUTOFF_USER_ID o CUTOFF_USER_EMAIL.");
  }

  if (targetUserId) {
    const rows = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (rows.length === 0) {
      throw new Error(`No existe usuario con id=${targetUserId}`);
    }

    return rows;
  }

  if (targetUserEmail) {
    const rows = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.email, targetUserEmail));

    if (rows.length === 0) {
      throw new Error(`No existe usuario con email=${targetUserEmail}`);
    }

    return rows;
  }

  return db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.role, "user"));
}

async function gatherDataset(userIds: number[], cutoffDate: Date): Promise<CutoverDataset> {
  if (userIds.length === 0) {
    return {
      ordersToArchive: [],
      orderItemsToArchive: [],
      orderPaymentsToArchive: [],
      orderCostsToArchive: [],
      transactionsToArchive: [],
    };
  }

  const ordersToArchive = await db
    .select()
    .from(orders)
    .where(
      and(
        inArray(orders.userId, userIds),
        lt(orders.createdAt, cutoffDate),
        isNull(orders.deletedAt),
      ),
    );

  const orderIds = ordersToArchive.map((order) => order.id);

  const [orderItemsToArchive, orderPaymentsToArchive, orderCostsToArchive] = orderIds.length
    ? await Promise.all([
        db
          .select()
          .from(orderItems)
          .where(and(inArray(orderItems.orderId, orderIds), isNull(orderItems.deletedAt))),
        db
          .select()
          .from(orderPayments)
          .where(and(inArray(orderPayments.orderId, orderIds), isNull(orderPayments.deletedAt))),
        db
          .select()
          .from(orderCosts)
          .where(inArray(orderCosts.orderId, orderIds)),
      ])
    : [[], [], []];

  const transactionsToArchive = await db
    .select()
    .from(transactions)
    .where(
      and(
        inArray(transactions.userId, userIds),
        lt(transactions.date, cutoffDate),
        isNull(transactions.deletedAt),
      ),
    );

  return {
    ordersToArchive,
    orderItemsToArchive,
    orderPaymentsToArchive,
    orderCostsToArchive,
    transactionsToArchive,
  };
}

function amountAsNumber(raw: string): number {
  const parsed = Number(raw || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function buildOpeningBalanceAdjustments(dataset: CutoverDataset): Promise<OpeningBalanceAdjustment[]> {
  const netByAccount = new Map<string, { userId: number; financialAccountId: number; net: number }>();

  for (const movement of dataset.transactionsToArchive) {
    if (!movement.financialAccountId) {
      continue;
    }

    const amount = amountAsNumber(movement.amount);
    if (amount === 0) {
      continue;
    }

    const direction = movement.type === "income" ? 1 : movement.type === "expense" ? -1 : 0;
    if (direction === 0) {
      continue;
    }

    const key = `${movement.userId}:${movement.financialAccountId}`;
    const current = netByAccount.get(key) || {
      userId: movement.userId,
      financialAccountId: movement.financialAccountId,
      net: 0,
    };

    current.net += direction * amount;
    netByAccount.set(key, current);
  }

  if (netByAccount.size === 0) {
    return [];
  }

  const accountIds = Array.from(new Set(Array.from(netByAccount.values()).map((entry) => entry.financialAccountId)));
  const accounts = await db
    .select({ id: financialAccounts.id, name: financialAccounts.name, userId: financialAccounts.userId })
    .from(financialAccounts)
    .where(inArray(financialAccounts.id, accountIds));

  const accountsById = new Map(accounts.map((account) => [account.id, account]));

  const adjustments: OpeningBalanceAdjustment[] = [];

  for (const entry of netByAccount.values()) {
    if (Math.abs(entry.net) < 0.005) {
      continue;
    }

    const account = accountsById.get(entry.financialAccountId);
    if (!account) {
      continue;
    }

    adjustments.push({
      userId: entry.userId,
      financialAccountId: entry.financialAccountId,
      accountName: account.name,
      type: entry.net >= 0 ? "income" : "expense",
      amount: Math.abs(entry.net).toFixed(2),
      net: Number(entry.net.toFixed(2)),
    });
  }

  return adjustments;
}

async function writeArchiveFile(params: {
  archiveDir: string;
  cutoffRaw: string;
  mode: Mode;
  usersToProcess: SelectedUser[];
  dataset: CutoverDataset;
  adjustments: OpeningBalanceAdjustment[];
}): Promise<string> {
  const now = new Date();
  const fileName = `cutover-${params.cutoffRaw}-${now.toISOString().replace(/[:.]/g, "-")}-${params.mode}.json`;
  const archivePath = path.join(params.archiveDir, fileName);

  const payload = {
    generatedAt: now.toISOString(),
    mode: params.mode,
    cutoffDate: params.cutoffRaw,
    users: params.usersToProcess,
    summary: {
      orders: params.dataset.ordersToArchive.length,
      orderItems: params.dataset.orderItemsToArchive.length,
      orderPayments: params.dataset.orderPaymentsToArchive.length,
      orderCosts: params.dataset.orderCostsToArchive.length,
      transactions: params.dataset.transactionsToArchive.length,
      openingBalanceAdjustments: params.adjustments.length,
    },
    openingBalanceAdjustments: params.adjustments,
    data: params.dataset,
  };

  await fs.mkdir(params.archiveDir, { recursive: true });
  await fs.writeFile(archivePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return archivePath;
}

async function applyCutover(params: {
  cutoffDate: Date;
  dataset: CutoverDataset;
  adjustments: OpeningBalanceAdjustment[];
  createOpeningBalances: boolean;
}) {
  const now = new Date();
  const orderIds = params.dataset.ordersToArchive.map((order) => order.id);
  const transactionIds = params.dataset.transactionsToArchive.map((movement) => movement.id);

  await db.transaction(async (tx) => {
    if (orderIds.length > 0) {
      await tx
        .update(orderItems)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(inArray(orderItems.orderId, orderIds), isNull(orderItems.deletedAt)));

      await tx
        .update(orderPayments)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(inArray(orderPayments.orderId, orderIds), isNull(orderPayments.deletedAt)));

      await tx
        .update(orders)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(inArray(orders.id, orderIds), isNull(orders.deletedAt)));
    }

    if (transactionIds.length > 0) {
      await tx
        .update(transactions)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(inArray(transactions.id, transactionIds), isNull(transactions.deletedAt)));
    }

    if (params.createOpeningBalances && params.adjustments.length > 0) {
      await tx.insert(transactions).values(
        params.adjustments.map((entry) => ({
          userId: entry.userId,
          type: entry.type,
          amount: entry.amount,
          description: `Saldo inicial post-corte historico (${params.cutoffDate.toISOString().slice(0, 10)})`,
          category: "ajuste_corte",
          reportArea: "Ajustes",
          reportConcept: "Saldo inicial",
          financialAccountId: entry.financialAccountId,
          date: params.cutoffDate,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
  });
}

function printSummary(params: {
  mode: Mode;
  cutoffRaw: string;
  usersToProcess: SelectedUser[];
  dataset: CutoverDataset;
  adjustments: OpeningBalanceAdjustment[];
  archivePath: string;
  createOpeningBalances: boolean;
}) {
  console.log("=== Historical Cutover ===");
  console.log(`Modo: ${params.mode}`);
  console.log(`Cutoff: ${params.cutoffRaw} (se archiva todo lo anterior)`);
  console.log(`Usuarios alcanzados: ${params.usersToProcess.length}`);
  console.log(`- Pedidos: ${params.dataset.ordersToArchive.length}`);
  console.log(`- Lineas de pedido: ${params.dataset.orderItemsToArchive.length}`);
  console.log(`- Pagos de pedido: ${params.dataset.orderPaymentsToArchive.length}`);
  console.log(`- Costos legacy: ${params.dataset.orderCostsToArchive.length}`);
  console.log(`- Transacciones: ${params.dataset.transactionsToArchive.length}`);
  console.log(
    `- Ajustes de saldo inicial: ${params.createOpeningBalances ? params.adjustments.length : 0}`,
  );
  console.log(`Archivo de respaldo: ${params.archivePath}`);
}

async function main() {
  const mode = getMode();
  mustConfirmApply(mode);

  await ensureSchemaReadyForCutover();

  const { raw: cutoffRaw, date: cutoffDate } = parseCutoffDate();
  const usersToProcess = await selectUsers();

  if (usersToProcess.length === 0) {
    throw new Error("No hay usuarios para procesar.");
  }

  const userIds = usersToProcess.map((user) => user.id);
  const dataset = await gatherDataset(userIds, cutoffDate);
  const createOpeningBalances = shouldCreateOpeningBalances();
  const adjustments = createOpeningBalances ? await buildOpeningBalanceAdjustments(dataset) : [];

  const archivePath = await writeArchiveFile({
    archiveDir: getArchiveDir(getRepoRoot()),
    cutoffRaw,
    mode,
    usersToProcess,
    dataset,
    adjustments,
  });

  printSummary({
    mode,
    cutoffRaw,
    usersToProcess,
    dataset,
    adjustments,
    archivePath,
    createOpeningBalances,
  });

  if (mode === "dry-run") {
    console.log("Dry-run completado. No se aplicaron cambios en la base.");
    return;
  }

  await applyCutover({
    cutoffDate,
    dataset,
    adjustments,
    createOpeningBalances,
  });

  console.log("Cutover aplicado correctamente.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
