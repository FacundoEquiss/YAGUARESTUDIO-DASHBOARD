import { pgTable, serial, integer, varchar, timestamp, text, numeric, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";
import { clients } from "./clients";
import { financialAccounts } from "./financial-accounts";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull().default("0"),
  quotedTotal: numeric("quoted_total", { precision: 12, scale: 2 }).notNull().default("0"),
  subtotalCost: numeric("subtotal_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  subtotalPrice: numeric("subtotal_price", { precision: 12, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
  financialStatus: varchar("financial_status", { length: 30 }).notNull().default("pending"),
  status: varchar("status", { length: 30 }).notNull().default("nuevo"),
  dueDate: timestamp("due_date"),
  deliveredAt: timestamp("delivered_at"),
  sourceQuoteId: varchar("source_quote_id", { length: 100 }),
  stockAppliedAt: timestamp("stock_applied_at"),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;

export const orderCosts = pgTable("order_costs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type OrderCost = typeof orderCosts.$inferSelect;

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lineType: varchar("line_type", { length: 40 }).notNull(),
  sourceType: varchar("source_type", { length: 40 }),
  sourceId: integer("source_id"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull().default("1"),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).notNull().default("0"),
  totalCost: numeric("total_cost", { precision: 14, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("total_price", { precision: 14, scale: 2 }).notNull().default("0"),
  grossMargin: numeric("gross_margin", { precision: 14, scale: 2 }).notNull().default("0"),
  affectsStock: boolean("affects_stock").notNull().default(false),
  affectsFinance: boolean("affects_finance").notNull().default(true),
  reportArea: varchar("report_area", { length: 100 }),
  reportConcept: varchar("report_concept", { length: 100 }),
  supplierId: integer("supplier_id"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type OrderItem = typeof orderItems.$inferSelect;

export const orderPayments = pgTable("order_payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  financialAccountId: integer("financial_account_id").references(() => financialAccounts.id, { onDelete: "set null" }),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("cash"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type OrderPayment = typeof orderPayments.$inferSelect;
