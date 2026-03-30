import { pgTable, serial, integer, varchar, timestamp, text, numeric } from "drizzle-orm/pg-core";
import { users } from "./users";
import { clients } from "./clients";
import { suppliers } from "./suppliers";
import { orders } from "./orders";
import { financialAccounts } from "./financial-accounts";

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  financialAccountId: integer("financial_account_id").references(() => financialAccounts.id, { onDelete: "set null" }),
  date: timestamp("date").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Transaction = typeof transactions.$inferSelect;
