import { pgTable, serial, integer, varchar, timestamp, text, numeric, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const financialAccounts = pgTable("financial_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  accountType: varchar("account_type", { length: 50 }).notNull().default("cash"),
  currency: varchar("currency", { length: 10 }).notNull().default("ARS"),
  openingBalance: numeric("opening_balance", { precision: 14, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type FinancialAccount = typeof financialAccounts.$inferSelect;
