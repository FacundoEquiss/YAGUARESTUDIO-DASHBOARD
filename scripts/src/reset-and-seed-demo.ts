import { eq, inArray } from "../../lib/db/node_modules/drizzle-orm";
import {
  clients,
  db,
  feedbacks,
  financialAccounts,
  orderCosts,
  orders,
  pool,
  productStockMovements,
  products,
  subscriptionPlans,
  suppliers,
  transactions,
  usageCounters,
  usageEvents,
  userDtfSettings,
  userSubscriptions,
  users,
} from "../../lib/db/src";
import { seedPlans } from "../../lib/db/src/seed-plans";

const DEFAULT_DEMO_EMAIL = "demo.premium@yaguarestudio.xyz";
const DEFAULT_DEMO_PASSWORD = "DemoPremium123!";
const DEFAULT_DEMO_PASSWORD_HASH = "$2b$10$9BG1eCrSOrU1e4/AmMdiVe3ynN02FUdpXwTn61pUMIOlRb1d8NgDa";

type Command = "reset-users" | "seed-demo" | "reset-and-seed-demo";
type MovementType = "purchase" | "sale";

function getCommand(): Command {
  const command = process.argv[2] as Command | undefined;
  if (!command || !["reset-users", "seed-demo", "reset-and-seed-demo"].includes(command)) {
    throw new Error("Usá uno de estos comandos: reset-users, seed-demo, reset-and-seed-demo");
  }
  return command;
}

function requireResetConfirmation() {
  if (process.env.CONFIRM_RESET_NON_MASTER_USERS !== "yes") {
    throw new Error("Para borrar usuarios no master, seteá CONFIRM_RESET_NON_MASTER_USERS=yes");
  }
}

function monthDate(monthOffset: number, day: number, hour = 10, minute = 0): Date {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, hour, minute, 0, 0);
  firstDay.setMonth(firstDay.getMonth() + monthOffset);
  firstDay.setDate(day);
  return firstDay;
}

function firstDayOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function firstDayOfNextMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
}

function preserveEmails(): string[] {
  const raw = [process.env.MASTER_EMAIL, process.env.PRESERVE_EMAILS]
    .filter(Boolean)
    .join(",");

  return Array.from(new Set(raw.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

async function deleteUsersByIds(userIds: number[]) {
  if (userIds.length === 0) return;

  await db.delete(feedbacks).where(inArray(feedbacks.userId, userIds));
  await db.delete(users).where(inArray(users.id, userIds));
}

async function resetNonMasterUsers() {
  const keepEmails = preserveEmails();
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    role: users.role,
  }).from(users);

  const usersToDelete = allUsers.filter((user: { id: number; email: string; role: string }) => user.role !== "master" && !keepEmails.includes(user.email.toLowerCase()));
  await deleteUsersByIds(usersToDelete.map((user) => user.id));

  console.log(`Reset listo. Usuarios borrados: ${usersToDelete.length}`);
}

async function applyStockMovement(params: {
  userId: number;
  productId: number;
  movementType: MovementType;
  quantity: number;
  unitCost: number;
  createdAt: Date;
  supplierId?: number | null;
  orderId?: number | null;
  notes?: string;
}) {
  const [product] = await db.select({
    currentStock: products.currentStock,
    costPrice: products.costPrice,
  }).from(products).where(eq(products.id, params.productId));

  if (!product) {
    throw new Error(`Producto ${params.productId} no encontrado`);
  }

  const signedQuantity = params.movementType === "sale" ? -Math.abs(params.quantity) : Math.abs(params.quantity);
  const newStock = Number(product.currentStock || 0) + signedQuantity;

  await db.insert(productStockMovements).values({
    userId: params.userId,
    productId: params.productId,
    supplierId: params.supplierId ?? null,
    orderId: params.orderId ?? null,
    movementType: params.movementType,
    quantity: signedQuantity.toFixed(2),
    unitCost: Math.max(0, params.unitCost).toFixed(2),
    notes: params.notes ?? null,
    createdAt: params.createdAt,
  });

  await db.update(products).set({
    currentStock: Math.max(0, newStock).toFixed(2),
    costPrice: Math.max(0, params.unitCost || Number(product.costPrice || 0)).toFixed(2),
    updatedAt: params.createdAt,
  }).where(eq(products.id, params.productId));
}

async function seedDemoWorkspace() {
  await seedPlans();

  const demoEmail = (process.env.DEMO_EMAIL || DEFAULT_DEMO_EMAIL).trim().toLowerCase();
  const demoName = (process.env.DEMO_NAME || "Cuenta Demo Premium").trim();
  const demoBusinessName = (process.env.DEMO_BUSINESS_NAME || "Yaguar Demo Studio").trim();

  const [existingDemo] = await db.select({
    id: users.id,
    role: users.role,
  }).from(users).where(eq(users.email, demoEmail));

  if (existingDemo?.role === "master") {
    throw new Error("El email demo coincide con una cuenta master. Elegí otro DEMO_EMAIL.");
  }

  if (existingDemo) {
    await deleteUsersByIds([existingDemo.id]);
  }

  const demoCreatedAt = monthDate(-2, 1, 9);

  const [demoUser] = await db.insert(users).values({
    email: demoEmail,
    name: demoName,
    businessName: demoBusinessName,
    passwordHash: DEFAULT_DEMO_PASSWORD_HASH,
    role: "user",
    phone: "+54 11 5555-0199",
    createdAt: demoCreatedAt,
  }).returning();

  const [premiumPlan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, "premium"));
  if (!premiumPlan) {
    throw new Error("No se encontró el plan premium");
  }

  await db.insert(userSubscriptions).values({
    userId: demoUser.id,
    planId: premiumPlan.id,
    status: "active",
    currentPeriodStart: firstDayOfCurrentMonth(),
    currentPeriodEnd: firstDayOfNextMonth(),
    mpSubscriptionId: "demo-premium-seed",
    mpLastEventId: "demo-manual-seed",
    createdAt: demoCreatedAt,
  });

  await db.insert(userDtfSettings).values({
    userId: demoUser.id,
    pricePerMeter: 23000,
    rollWidth: 58,
    baseMargin: 3200,
    wholesaleMargin: 2200,
    pressPassThreshold: 2,
    pressPassExtraCost: 1100,
    talleEnabled: true,
    talleSurcharge: 900,
    updatedAt: new Date(),
  });

  const [cashAccount, mercadoPagoAccount, santanderAccount] = await db.insert(financialAccounts).values([
    {
      userId: demoUser.id,
      name: "Efectivo",
      accountType: "cash",
      currency: "ARS",
      openingBalance: "120000.00",
      notes: "Caja principal del taller",
      createdAt: monthDate(-2, 1, 9),
      updatedAt: new Date(),
    },
    {
      userId: demoUser.id,
      name: "Mercado Pago",
      accountType: "wallet",
      currency: "ARS",
      openingBalance: "85000.00",
      notes: "Cobros digitales y links",
      createdAt: monthDate(-2, 1, 9),
      updatedAt: new Date(),
    },
    {
      userId: demoUser.id,
      name: "Santander Rio",
      accountType: "bank",
      currency: "ARS",
      openingBalance: "240000.00",
      notes: "Cuenta bancaria principal",
      createdAt: monthDate(-2, 1, 9),
      updatedAt: new Date(),
    },
  ]).returning();

  const [textiles, dtfMayorista, logistica] = await db.insert(suppliers).values([
    { userId: demoUser.id, name: "Textiles del Sur", businessName: "Textiles del Sur SA", category: "Indumentaria", phone: "+54 11 4000-1111", createdAt: monthDate(-2, 2), updatedAt: new Date() },
    { userId: demoUser.id, name: "DTF Mayorista Pro", businessName: "DTF Mayorista Pro", category: "Insumos DTF", phone: "+54 11 4000-2222", createdAt: monthDate(-2, 2), updatedAt: new Date() },
    { userId: demoUser.id, name: "Logistica Flash", businessName: "Logistica Flash", category: "Envios", phone: "+54 11 4000-3333", createdAt: monthDate(-2, 2), updatedAt: new Date() },
  ]).returning();

  const [pablo, valentina, gymNova, estudioCentral, tiendaUrbana, agenciaPrisma] = await db.insert(clients).values([
    { userId: demoUser.id, name: "Pablo", phone: "+54 11 6000-1111", notes: "Cliente frecuente de remeras personalizadas", createdAt: monthDate(-2, 5), updatedAt: new Date() },
    { userId: demoUser.id, name: "Valentina", phone: "+54 11 6000-2222", notes: "Pedidos medianos para marca propia", createdAt: monthDate(-2, 5), updatedAt: new Date() },
    { userId: demoUser.id, name: "Gym Nova", businessName: "Gym Nova", notes: "Cliente corporativo", createdAt: monthDate(-2, 5), updatedAt: new Date() },
    { userId: demoUser.id, name: "Estudio Central", businessName: "Estudio Central", notes: "Agencia de diseño y branding", createdAt: monthDate(-2, 5), updatedAt: new Date() },
    { userId: demoUser.id, name: "Tienda Urbana", businessName: "Tienda Urbana", notes: "Local de indumentaria urbana", createdAt: monthDate(-2, 5), updatedAt: new Date() },
    { userId: demoUser.id, name: "Agencia Prisma", businessName: "Agencia Prisma", notes: "Eventos y promociones", createdAt: monthDate(-2, 5), updatedAt: new Date() },
  ]).returning();

  const [oversize, regular, buzo, packaging, rolloDtf] = await db.insert(products).values([
    { userId: demoUser.id, supplierId: textiles.id, name: "Remera Oversize Negra", sku: "REM-OVS-NEG", category: "Indumentaria", unit: "unidad", salePrice: "14000.00", costPrice: "0.00", currentStock: "0.00", minStock: "8.00", notes: "Base oversize algodon 24/1", createdAt: monthDate(-2, 2), updatedAt: new Date() },
    { userId: demoUser.id, supplierId: textiles.id, name: "Remera Regular Blanca", sku: "REM-REG-BLA", category: "Indumentaria", unit: "unidad", salePrice: "12000.00", costPrice: "0.00", currentStock: "0.00", minStock: "10.00", notes: "Remera regular para pedidos de volumen", createdAt: monthDate(-2, 2), updatedAt: new Date() },
    { userId: demoUser.id, supplierId: textiles.id, name: "Buzo Unisex Negro", sku: "BUZ-UNI-NEG", category: "Indumentaria", unit: "unidad", salePrice: "25000.00", costPrice: "0.00", currentStock: "0.00", minStock: "4.00", notes: "Buzo frizado para invierno", createdAt: monthDate(-2, 2), updatedAt: new Date() },
    { userId: demoUser.id, supplierId: textiles.id, name: "Bolsa Packaging Premium", sku: "PACK-BOL", category: "Packaging", unit: "unidad", salePrice: "900.00", costPrice: "0.00", currentStock: "0.00", minStock: "20.00", notes: "Bolsa y presentacion final", createdAt: monthDate(-2, 2), updatedAt: new Date() },
    { userId: demoUser.id, supplierId: dtfMayorista.id, name: "Rollo DTF 58cm", sku: "DTF-ROL-58", category: "Insumos", unit: "rollo", salePrice: "0.00", costPrice: "0.00", currentStock: "0.00", minStock: "1.00", notes: "Rollo de pelicula DTF", createdAt: monthDate(-2, 2), updatedAt: new Date() },
  ]).returning();

  const productMap = {
    oversize,
    regular,
    buzo,
    packaging,
    rolloDtf,
  };

  const purchaseSeeds = [
    { date: monthDate(-2, 3), product: productMap.oversize, quantity: 40, unitCost: 5900, supplierId: textiles.id, accountId: santanderAccount.id, description: "Compra inicial de oversize negras" },
    { date: monthDate(-2, 4), product: productMap.regular, quantity: 50, unitCost: 4300, supplierId: textiles.id, accountId: santanderAccount.id, description: "Compra inicial de remeras regulares" },
    { date: monthDate(-1, 5), product: productMap.buzo, quantity: 24, unitCost: 10500, supplierId: textiles.id, accountId: santanderAccount.id, description: "Reposicion de buzos negros" },
    { date: monthDate(-1, 6), product: productMap.packaging, quantity: 150, unitCost: 360, supplierId: textiles.id, accountId: cashAccount.id, description: "Compra de bolsas premium" },
    { date: monthDate(0, 4), product: productMap.oversize, quantity: 24, unitCost: 6100, supplierId: textiles.id, accountId: santanderAccount.id, description: "Reposicion de oversize para marzo" },
    { date: monthDate(0, 5), product: productMap.rolloDtf, quantity: 6, unitCost: 68000, supplierId: dtfMayorista.id, accountId: mercadoPagoAccount.id, description: "Compra de rollos DTF" },
  ];

  for (const purchase of purchaseSeeds) {
    await applyStockMovement({
      userId: demoUser.id,
      productId: purchase.product.id,
      movementType: "purchase",
      quantity: purchase.quantity,
      unitCost: purchase.unitCost,
      createdAt: purchase.date,
      supplierId: purchase.supplierId,
      notes: purchase.description,
    });

    await db.insert(transactions).values({
      userId: demoUser.id,
      type: "expense",
      amount: (purchase.quantity * purchase.unitCost).toFixed(2),
      description: purchase.description,
      category: "materiales",
      supplierId: purchase.supplierId,
      financialAccountId: purchase.accountId,
      date: purchase.date,
      createdAt: purchase.date,
      updatedAt: purchase.date,
    });
  }

  const orderSeeds = [
    {
      date: monthDate(-2, 8),
      dueDate: monthDate(-2, 12),
      clientId: pablo.id,
      clientName: pablo.name,
      title: "10 remeras personalizadas para Pablo",
      description: "10 remeras oversize negras con espalda 28x32 cm y pecho 8x8 cm.",
      quantity: 10,
      totalPrice: 198000,
      status: "entregado",
      costItems: [
        { title: "DTF espalda y pecho", amount: 52000 },
        { title: "Remeras base", amount: 59000 },
        { title: "Packaging", amount: 3600 },
      ],
      payments: [
        { date: monthDate(-2, 8, 12), amount: 120000, category: "anticipo", accountId: mercadoPagoAccount.id, description: "Anticipo Pablo" },
        { date: monthDate(-2, 12, 18), amount: 78000, category: "venta", accountId: cashAccount.id, description: "Saldo Pablo" },
      ],
      expenses: [
        { date: monthDate(-2, 12, 17), amount: 4500, category: "envio", accountId: cashAccount.id, description: "Entrega Pablo" },
      ],
      stockUsage: [
        { productId: oversize.id, quantity: 10, unitCost: 5900, notes: "Salida por pedido de Pablo" },
        { productId: packaging.id, quantity: 10, unitCost: 360, notes: "Packaging pedido Pablo" },
      ],
    },
    {
      date: monthDate(-2, 16),
      dueDate: monthDate(-2, 19),
      clientId: valentina.id,
      clientName: valentina.name,
      title: "6 remeras blancas para marca de Valentina",
      description: "Frente chico + estampa central full color.",
      quantity: 6,
      totalPrice: 108000,
      status: "entregado",
      costItems: [
        { title: "DTF frente", amount: 24000 },
        { title: "Remeras base", amount: 25800 },
        { title: "Packaging", amount: 2160 },
      ],
      payments: [
        { date: monthDate(-2, 19, 13), amount: 108000, category: "venta", accountId: cashAccount.id, description: "Pago total Valentina" },
      ],
      expenses: [
        { date: monthDate(-2, 19, 14), amount: 3200, category: "envio", accountId: cashAccount.id, description: "Envio Valentina" },
      ],
      stockUsage: [
        { productId: regular.id, quantity: 6, unitCost: 4300, notes: "Salida por pedido de Valentina" },
        { productId: packaging.id, quantity: 6, unitCost: 360, notes: "Packaging pedido Valentina" },
      ],
    },
    {
      date: monthDate(-2, 25),
      dueDate: monthDate(-1, 3),
      clientId: gymNova.id,
      clientName: gymNova.name,
      title: "12 buzos para Gym Nova",
      description: "Buzos institucionales con logo frontal y espalda.",
      quantity: 12,
      totalPrice: 360000,
      status: "entregado",
      costItems: [
        { title: "DTF institucional", amount: 72000 },
        { title: "Buzos base", amount: 126000 },
        { title: "Packaging", amount: 4320 },
      ],
      payments: [
        { date: monthDate(-2, 25, 11), amount: 200000, category: "anticipo", accountId: santanderAccount.id, description: "Anticipo Gym Nova" },
        { date: monthDate(-1, 4, 16), amount: 160000, category: "venta", accountId: santanderAccount.id, description: "Saldo Gym Nova" },
      ],
      expenses: [
        { date: monthDate(-1, 3, 15), amount: 8500, category: "envio", accountId: mercadoPagoAccount.id, description: "Flete Gym Nova" },
      ],
      stockUsage: [
        { productId: buzo.id, quantity: 12, unitCost: 10500, notes: "Salida por pedido Gym Nova" },
        { productId: packaging.id, quantity: 12, unitCost: 360, notes: "Packaging Gym Nova" },
      ],
    },
    {
      date: monthDate(-1, 6),
      dueDate: monthDate(-1, 9),
      clientId: estudioCentral.id,
      clientName: estudioCentral.name,
      title: "120 stickers DTF para Estudio Central",
      description: "Pedido de stickers para activacion de marca.",
      quantity: 120,
      totalPrice: 95000,
      status: "entregado",
      costItems: [
        { title: "Impresion DTF", amount: 26000 },
        { title: "Corte y terminacion", amount: 9000 },
      ],
      payments: [
        { date: monthDate(-1, 9, 13), amount: 95000, category: "venta", accountId: mercadoPagoAccount.id, description: "Pago Estudio Central" },
      ],
      expenses: [
        { date: monthDate(-1, 9, 17), amount: 2200, category: "envio", accountId: mercadoPagoAccount.id, description: "Envio Estudio Central" },
      ],
      stockUsage: [],
    },
    {
      date: monthDate(-1, 14),
      dueDate: monthDate(-1, 18),
      clientId: tiendaUrbana.id,
      clientName: tiendaUrbana.name,
      title: "18 remeras para Tienda Urbana",
      description: "Remeras regulares para reventa con diseño frontal.",
      quantity: 18,
      totalPrice: 324000,
      status: "entregado",
      costItems: [
        { title: "DTF frontal", amount: 58000 },
        { title: "Remeras base", amount: 77400 },
        { title: "Packaging", amount: 6480 },
      ],
      payments: [
        { date: monthDate(-1, 14, 12), amount: 200000, category: "anticipo", accountId: mercadoPagoAccount.id, description: "Anticipo Tienda Urbana" },
        { date: monthDate(0, 3, 16), amount: 124000, category: "venta", accountId: santanderAccount.id, description: "Saldo Tienda Urbana" },
      ],
      expenses: [
        { date: monthDate(-1, 18, 18), amount: 5900, category: "envio", accountId: cashAccount.id, description: "Flete Tienda Urbana" },
      ],
      stockUsage: [
        { productId: regular.id, quantity: 18, unitCost: 4300, notes: "Salida por pedido Tienda Urbana" },
        { productId: packaging.id, quantity: 18, unitCost: 360, notes: "Packaging Tienda Urbana" },
      ],
    },
    {
      date: monthDate(-1, 22),
      dueDate: monthDate(-1, 25),
      clientId: pablo.id,
      clientName: pablo.name,
      title: "4 buzos premium para Pablo",
      description: "Buzos negros con frente y espalda full color.",
      quantity: 4,
      totalPrice: 132000,
      status: "entregado",
      costItems: [
        { title: "DTF completo", amount: 24000 },
        { title: "Buzos base", amount: 42000 },
        { title: "Packaging", amount: 1440 },
      ],
      payments: [
        { date: monthDate(-1, 25, 15), amount: 132000, category: "venta", accountId: cashAccount.id, description: "Pago total Pablo - buzos" },
      ],
      expenses: [
        { date: monthDate(-1, 25, 18), amount: 2500, category: "envio", accountId: cashAccount.id, description: "Entrega Pablo - buzos" },
      ],
      stockUsage: [
        { productId: buzo.id, quantity: 4, unitCost: 10500, notes: "Salida por pedido Pablo febrero" },
        { productId: packaging.id, quantity: 4, unitCost: 360, notes: "Packaging Pablo febrero" },
      ],
    },
    {
      date: monthDate(0, 7),
      dueDate: monthDate(0, 11),
      clientId: agenciaPrisma.id,
      clientName: agenciaPrisma.name,
      title: "15 remeras oversize para Agencia Prisma",
      description: "Remeras para evento promocional con espalda full.",
      quantity: 15,
      totalPrice: 315000,
      status: "entregado",
      costItems: [
        { title: "DTF full", amount: 76000 },
        { title: "Remeras base", amount: 91500 },
        { title: "Packaging", amount: 5400 },
      ],
      payments: [
        { date: monthDate(0, 11, 14), amount: 315000, category: "venta", accountId: santanderAccount.id, description: "Pago Agencia Prisma" },
      ],
      expenses: [
        { date: monthDate(0, 11, 17), amount: 7800, category: "envio", accountId: mercadoPagoAccount.id, description: "Envio Agencia Prisma" },
      ],
      stockUsage: [
        { productId: oversize.id, quantity: 15, unitCost: 6100, notes: "Salida por pedido Agencia Prisma" },
        { productId: packaging.id, quantity: 15, unitCost: 360, notes: "Packaging Agencia Prisma" },
      ],
    },
    {
      date: monthDate(0, 15),
      dueDate: monthDate(0, 21),
      clientId: valentina.id,
      clientName: valentina.name,
      title: "8 remeras oversize para lanzamiento de Valentina",
      description: "Pedido en produccion con anticipo confirmado.",
      quantity: 8,
      totalPrice: 168000,
      status: "en_produccion",
      costItems: [
        { title: "DTF frente + espalda", amount: 42000 },
        { title: "Remeras base", amount: 48800 },
        { title: "Packaging", amount: 2880 },
      ],
      payments: [
        { date: monthDate(0, 15, 12), amount: 70000, category: "anticipo", accountId: mercadoPagoAccount.id, description: "Anticipo Valentina marzo" },
      ],
      expenses: [],
      stockUsage: [],
    },
    {
      date: monthDate(0, 23),
      dueDate: monthDate(0, 30),
      clientId: gymNova.id,
      clientName: gymNova.name,
      title: "20 remeras regulares para staff de Gym Nova",
      description: "Pedido nuevo en espera de confirmacion final.",
      quantity: 20,
      totalPrice: 360000,
      status: "nuevo",
      costItems: [
        { title: "DTF staff", amount: 78000 },
        { title: "Remeras base", amount: 86000 },
        { title: "Packaging", amount: 7200 },
      ],
      payments: [],
      expenses: [],
      stockUsage: [],
    },
  ];

  for (const seed of orderSeeds) {
    const [order] = await db.insert(orders).values({
      userId: demoUser.id,
      clientId: seed.clientId,
      clientName: seed.clientName,
      title: seed.title,
      description: seed.description,
      quantity: seed.quantity,
      unitPrice: (seed.totalPrice / seed.quantity).toFixed(2),
      totalPrice: seed.totalPrice.toFixed(2),
      status: seed.status,
      dueDate: seed.dueDate,
      notes: "Dato ficticio generado para demo visual.",
      createdAt: seed.date,
      updatedAt: seed.date,
    }).returning();

    if (seed.costItems.length > 0) {
      await db.insert(orderCosts).values(seed.costItems.map((item) => ({
        orderId: order.id,
        title: item.title,
        amount: item.amount.toFixed(2),
        createdAt: seed.date,
      })));
    }

    for (const payment of seed.payments) {
      await db.insert(transactions).values({
        userId: demoUser.id,
        type: "income",
        amount: payment.amount.toFixed(2),
        description: payment.description,
        category: payment.category,
        clientId: seed.clientId,
        orderId: order.id,
        financialAccountId: payment.accountId,
        date: payment.date,
        createdAt: payment.date,
        updatedAt: payment.date,
      });
    }

    for (const expense of seed.expenses) {
      await db.insert(transactions).values({
        userId: demoUser.id,
        type: "expense",
        amount: expense.amount.toFixed(2),
        description: expense.description,
        category: expense.category,
        clientId: seed.clientId,
        orderId: order.id,
        supplierId: logistica.id,
        financialAccountId: expense.accountId,
        date: expense.date,
        createdAt: expense.date,
        updatedAt: expense.date,
      });
    }

    for (const movement of seed.stockUsage) {
      await applyStockMovement({
        userId: demoUser.id,
        productId: movement.productId,
        movementType: "sale",
        quantity: movement.quantity,
        unitCost: movement.unitCost,
        createdAt: seed.date,
        orderId: order.id,
        notes: movement.notes,
      });
    }
  }

  const generalTransactions = [
    { date: monthDate(-2, 10), type: "expense" as const, amount: 65000, category: "servicios", description: "Publicidad Meta enero", accountId: mercadoPagoAccount.id },
    { date: monthDate(-2, 28), type: "expense" as const, amount: 185000, category: "servicios", description: "Alquiler y taller enero", accountId: santanderAccount.id },
    { date: monthDate(-1, 10), type: "expense" as const, amount: 72000, category: "servicios", description: "Publicidad Meta febrero", accountId: mercadoPagoAccount.id },
    { date: monthDate(-1, 27), type: "expense" as const, amount: 185000, category: "servicios", description: "Alquiler y taller febrero", accountId: santanderAccount.id },
    { date: monthDate(0, 10), type: "expense" as const, amount: 78000, category: "servicios", description: "Publicidad Meta marzo", accountId: mercadoPagoAccount.id },
    { date: monthDate(0, 20), type: "expense" as const, amount: 48000, category: "impuestos", description: "Impuestos y percepciones marzo", accountId: santanderAccount.id },
    { date: monthDate(0, 27), type: "expense" as const, amount: 185000, category: "servicios", description: "Alquiler y taller marzo", accountId: santanderAccount.id },
    { date: monthDate(0, 28), type: "income" as const, amount: 42000, category: "otro", description: "Servicio rapido de diseño", accountId: cashAccount.id },
  ];

  await db.insert(transactions).values(generalTransactions.map((transaction) => ({
    userId: demoUser.id,
    type: transaction.type,
    amount: transaction.amount.toFixed(2),
    description: transaction.description,
    category: transaction.category,
    financialAccountId: transaction.accountId,
    date: transaction.date,
    createdAt: transaction.date,
    updatedAt: transaction.date,
  })));

  const usageSeed = [
    { monthOffset: -2, day: 4, type: "dtf_quotes", count: 6 },
    { monthOffset: -2, day: 8, type: "mockup_pngs", count: 3 },
    { monthOffset: -2, day: 12, type: "dtf_quotes", count: 5 },
    { monthOffset: -2, day: 18, type: "pdf_exports", count: 2 },
    { monthOffset: -2, day: 24, type: "dtf_quotes", count: 4 },
    { monthOffset: -1, day: 3, type: "dtf_quotes", count: 5 },
    { monthOffset: -1, day: 7, type: "mockup_pngs", count: 4 },
    { monthOffset: -1, day: 11, type: "dtf_quotes", count: 7 },
    { monthOffset: -1, day: 15, type: "pdf_exports", count: 3 },
    { monthOffset: -1, day: 21, type: "mockup_pngs", count: 3 },
    { monthOffset: -1, day: 26, type: "dtf_quotes", count: 6 },
    { monthOffset: 0, day: 2, type: "dtf_quotes", count: 5 },
    { monthOffset: 0, day: 5, type: "mockup_pngs", count: 3 },
    { monthOffset: 0, day: 9, type: "dtf_quotes", count: 4 },
    { monthOffset: 0, day: 13, type: "pdf_exports", count: 2 },
    { monthOffset: 0, day: 18, type: "mockup_pngs", count: 4 },
    { monthOffset: 0, day: 22, type: "dtf_quotes", count: 5 },
    { monthOffset: 0, day: 27, type: "dtf_quotes", count: 4 },
    { monthOffset: 0, day: 29, type: "mockup_pngs", count: 2 },
  ];

  const usageEventsToInsert: Array<{
    userId: number;
    eventType: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }> = [];

  for (const item of usageSeed) {
    for (let index = 0; index < item.count; index += 1) {
      const createdAt = monthDate(item.monthOffset, item.day, 9 + (index % 8), (index * 7) % 60);
      usageEventsToInsert.push({
        userId: demoUser.id,
        eventType: item.type,
        metadata: {
          source: "demo-seed",
          iteration: index + 1,
        },
        createdAt,
      });
    }
  }

  await db.insert(usageEvents).values(usageEventsToInsert);

  const currentPeriodStart = firstDayOfCurrentMonth();
  const currentMonthCounts = usageEventsToInsert.reduce<Record<string, number>>((acc, event) => {
    if (event.createdAt >= currentPeriodStart) {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
    }
    return acc;
  }, {});

  await db.insert(usageCounters).values([
    {
      userId: demoUser.id,
      counterType: "dtf_quotes",
      count: currentMonthCounts.dtf_quotes || 0,
      periodStart: currentPeriodStart,
    },
    {
      userId: demoUser.id,
      counterType: "mockup_pngs",
      count: currentMonthCounts.mockup_pngs || 0,
      periodStart: currentPeriodStart,
    },
    {
      userId: demoUser.id,
      counterType: "pdf_exports",
      count: currentMonthCounts.pdf_exports || 0,
      periodStart: currentPeriodStart,
    },
  ]);

  console.log(`Demo lista:
  email: ${demoEmail}
  password: ${DEFAULT_DEMO_PASSWORD}
  usuario: ${demoUser.id}
  clientes: 6
  proveedores: 3
  productos: 5
  pedidos: ${orderSeeds.length}
  eventos de uso: ${usageEventsToInsert.length}`);
}

async function main() {
  const command = getCommand();

  if (command === "reset-users") {
    requireResetConfirmation();
    await resetNonMasterUsers();
  }

  if (command === "seed-demo") {
    await seedDemoWorkspace();
  }

  if (command === "reset-and-seed-demo") {
    requireResetConfirmation();
    await resetNonMasterUsers();
    await seedDemoWorkspace();
  }
}

main()
  .catch((error) => {
    console.error("reset-and-seed-demo error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
